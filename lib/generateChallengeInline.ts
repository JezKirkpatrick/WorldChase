import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NARRATIVE_STYLES, EVENT_THEMES } from '@/lib/eventThemes'
import type { EventTheme } from '@/lib/eventThemes'

const STREET_VIEW_ROUNDS = [1, 6, 11, 16]

// Verify Street View coverage via Google's free Metadata API before saving the challenge.
// Returns true if coverage exists (or if the check itself fails — fail open).
async function verifyStreetView(lat: number, lng: number): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return true
  try {
    for (const radius of [150, 500]) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${radius}&source=outdoor&key=${key}`,
        { headers: { Referer: 'https://worldchase.net' } }
      )
      const data = await res.json()
      if (data.status === 'OK') return true
      if (radius === 500 && data.status === 'ZERO_RESULTS') return false
    }
    return true
  } catch {
    return true // network error — fail open so generation isn't blocked
  }
}

export const DIFFICULTY_FOR_ROUND = (round: number): string =>
  round <= 5 ? 'easy' : round <= 10 ? 'medium' : round <= 15 ? 'hard' : 'extreme'

export function inferThemeId(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('asia') || n.includes('pacific')) return 'asia_pacific'
  if (n.includes('america')) return 'americas'
  if (n.includes('africa') || n.includes('middle')) return 'africa_middle'
  if (n.includes('europe') || n.includes('hidden')) return 'europe_hidden'
  if (n.includes('natural') || n.includes('wonder')) return 'natural_wonders'
  if (n.includes('ancient') || n.includes('civiliz')) return 'ancient_worlds'
  if (n.includes('island')) return 'islands'
  if (n.includes('urban')) return 'urban_jungle'
  if (n.includes('extreme') || n.includes('remote')) return 'extreme_remote'
  return 'global'
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function randomOffset(km: number) {
  const angle = Math.random() * 2 * Math.PI
  const dist = (0.5 + Math.random() * 0.5) * km
  return { dLat: (dist * Math.cos(angle)) / 111.32, dLng: (dist * Math.sin(angle)) / 111.32 }
}

function buildStreetViewPrompt(roundNumber: number, difficulty: string, existingLocations: string[], eventTheme?: EventTheme, currentEventLocations?: string[]): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000, pro: 10000 }
  const narrativeStyle = NARRATIVE_STYLES[(roundNumber - 1) % NARRATIVE_STYLES.length]
  const themeSection = eventTheme
    ? `\nEVENT THEME: "${eventTheme.label}" — ${eventTheme.description}
REQUIRED REGION FOCUS: ${eventTheme.regionFocus}
AVOID: ${eventTheme.avoidRegions}\n`
    : ''

  const banSource = currentEventLocations ?? existingLocations
  const usedCountries = [...new Set(banSource
    .map(loc => (loc.split(',').pop() ?? '').trim())
    .filter(c => c))]
  const countryBan = usedCountries.length > 0
    ? `\nBANNED COUNTRIES (already used this event — do NOT pick any of these): ${usedCountries.join(', ')}\n`
    : ''

  return `You are the game master for "World Chase" — a competitive geography game.
${themeSection}${countryBan}
Generate ONE Street View Observation challenge for Round ${roundNumber}, difficulty: ${difficulty.toUpperCase()}.

CRITICAL — STREET VIEW COVERAGE REQUIREMENT:
The location MUST have official Google Street View car coverage (blue road lines on Google Maps). Players will be dropped into live Street View — if it doesn't exist the round breaks entirely.
SAFE REGIONS with extensive Street View: Western Europe, North America, Japan, South Korea, Australia, New Zealand, Brazil major cities, South Africa major cities, major cities in Southeast Asia.
AVOID for EASY/MEDIUM rounds: Pacific islands (Cook Islands, Tonga, Samoa, Fiji, Solomon Islands, Vanuatu etc.), most of Sub-Saharan Africa (outside major cities), Central Asia, rural India, rural Southeast Asia. These regions often have NO car Street View.
For HARD/EXTREME/PRO: you may pick more obscure areas but the specific road/street you give MUST have the blue Google car line — not just photo spheres. Verify by imagining the exact GPS coordinates exist on a main/secondary road, not a remote trail.
NOT user-contributed 360° photos. The location must have navigable street-level imagery with road arrows so players can walk along the street.

The observation question must be answerable by carefully looking at the Street View imagery. Questions should be specific with a clear, unambiguous answer.

DIFFICULTY GUIDE for observation questions:
- EASY: A world-famous street, boulevard, or plaza in a major tourist city (Paris, Tokyo, New York, London, Sydney, Rome, etc.). Count something large and obvious (flags, vehicles, market stalls). Answer must be a simple small number (1–9).
- MEDIUM: Identify something specific (color, word, symbol) on a recognizable but less-famous location in a well-covered country.
- HARD: Count or identify something subtle on a less-visited but still Street View covered street or small town.
- EXTREME: Spot a tiny or hidden detail in an unusual but car-covered location.
- PRO: An obscure location that still has blue car Street View lines — a small town, unusual road, or remote settlement with confirmed coverage. NOT an unmapped island. The detail must be nearly impossible to spot.

CLUE WRITING RULES — CRITICAL:
Players are dropped into Google Street View with NO idea where to look or which way to navigate. Every clue MUST contain two parts:
1. A NAVIGATION DIRECTION — tell the player which way to face or walk (e.g. "face the building directly ahead", "walk forward along the street until you reach the square", "turn to face the cliff above you", "look up to your left").
2. An OBSERVATION HINT — what to look for once they're positioned correctly.
Clues progress from vague (1) to near-explicit (4). Clue 4 must make the answer findable without guessing.

NARRATIVE STYLE FOR THIS ROUND: ${narrativeStyle}
Write the riddle_text in this exact style — atmospheric and genre-appropriate.

DO NOT use any of these already-used locations: ${existingLocations.join(', ')}

Respond with ONLY valid JSON — no markdown:
{
  "round_number": ${roundNumber},
  "difficulty": "${difficulty}",
  "location_name": "official street/place name",
  "location_country": "country",
  "location_lat": 0.0,
  "location_lng": 0.0,
  "map_start_lat": 0.0,
  "map_start_lng": 0.0,
  "street_view_heading": 0,
  "street_view_pitch": 0,
  "street_view_only": true,
  "street_view_question": "The exact observation question players must answer",
  "points_value": ${pointsMap[difficulty] ?? 500},
  "riddle_text": "A one-sentence intro setting the scene in the specified narrative style. Do not give away the answer.",
  "clues": [
    {"order":1,"text":"[Direction: vague] + [Observation: vague hint]"},
    {"order":2,"text":"[Direction: slightly more specific] + [Observation: more specific hint]"},
    {"order":3,"text":"[Direction: clear instruction] + [Observation: clear hint]"},
    {"order":4,"text":"[Direction: explicit] + [Observation: nearly explicit answer]"}
  ],
  "answer_keywords": ["exact answer", "alternate phrasing"],
  "fun_fact": "One interesting fact about this location."
}`
}

function buildPrompt(roundNumber: number, difficulty: string, existingLocations: string[], eventTheme?: EventTheme, currentEventLocations?: string[]): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000, pro: 10000 }
  const narrativeStyle = NARRATIVE_STYLES[(roundNumber - 1) % NARRATIVE_STYLES.length]
  const themeSection = eventTheme
    ? `\nEVENT THEME: "${eventTheme.label}" — ${eventTheme.description}
REQUIRED REGION FOCUS: ${eventTheme.regionFocus}
AVOID: ${eventTheme.avoidRegions}\n`
    : ''

  const banSource = currentEventLocations ?? existingLocations
  const usedCountries = [...new Set(banSource
    .map(loc => (loc.split(',').pop() ?? '').trim())
    .filter(c => c))]
  const countryBan = usedCountries.length > 0
    ? `\nBANNED COUNTRIES (already used this event — do NOT pick any of these): ${usedCountries.join(', ')}\n`
    : ''

  return `You are the game master for "World Chase" — a brutal weekly geography competition where players pay real money for extra clues and race for a global leaderboard.
${themeSection}${countryBan}
Generate ONE unique, extraordinary challenge for Round ${roundNumber}, difficulty: ${difficulty.toUpperCase()}.

GEOGRAPHIC DIVERSITY RULE: This challenge must be in a DIFFERENT country than every location in the existing list below. Spread across different sub-regions of the theme's focus area.

DIFFICULTY GUIDE:
- EASY: The most iconic, universally-recognised landmarks in the theme region — places every person would know.
- MEDIUM: Remarkable but less globally-famous destinations within the theme region.
- HARD: Genuinely obscure — remote towns, unusual geological features, niche cultural sites within the theme region.
- EXTREME: The most forgotten, bizarre, inhospitable, or absurdly remote locations within the theme region.
- PRO: Beyond extreme. Places that even seasoned geographers would fail to identify — micro-territories, abandoned ghost settlements, unnamed glaciers, island specks in the open ocean, border anomalies, or locations so obscure they barely appear on any map. The riddle must give almost nothing away. Map start must be on a different continent to the answer.

NARRATIVE STYLE FOR THIS ROUND: ${narrativeStyle}
Write the riddle_text in this exact style — make it atmospheric, literary, and fully genre-appropriate. This is the most important creative element.

WRITING RULES:
- Riddle text must match the narrative style above perfectly. Do not default to generic poetic writing.
- NEVER name the location, country, or any direct identifier in the riddle.
- Clues must progress from HARDEST (1) to EASIEST (4).
- For EASY difficulty: clue 3 must strongly hint at the country, and clue 4 must nearly name the location directly.
- Map start distance from answer: easy=2–5km, medium=10–30km, hard=50–150km, extreme=200–500km, pro=different continent entirely
- Hard and extreme map starts must begin in a completely different country or region.
- PRO map starts must begin on a completely different continent to the answer location.
- DO NOT use any of these already-used locations: ${existingLocations.join(', ')}

Respond with ONLY valid JSON — no markdown:
{
  "round_number": ${roundNumber},
  "difficulty": "${difficulty}",
  "location_name": "official name",
  "location_country": "country",
  "location_lat": 0.0,
  "location_lng": 0.0,
  "map_start_lat": 0.0,
  "map_start_lng": 0.0,
  "street_view_heading": 0,
  "street_view_pitch": 0,
  "street_view_only": false,
  "street_view_question": null,
  "points_value": ${pointsMap[difficulty] ?? 500},
  "riddle_text": "3-5 sentences written in the specified narrative style",
  "clues": [
    {"order":1,"text":"hardest clue"},
    {"order":2,"text":"medium clue"},
    {"order":3,"text":"easier clue"},
    {"order":4,"text":"easiest clue — almost explicit"}
  ],
  "answer_keywords": ["primary","alternate spelling","landmark name"],
  "fun_fact": "One astonishing fact about this location."
}`
}

async function tryGenerateOnce(params: {
  roundNumber: number
  difficulty: string
  eventId: string
  existingLocations: string[]
  eventTheme?: EventTheme
}): Promise<string | null> {
  const { roundNumber, difficulty, eventId, existingLocations, eventTheme } = params

  try {
    // Query current event's challenges BEFORE calling AI — used for both prompt ban list and duplicate check
    const supabase = getSupabase()
    const { data: existingEventChallenges } = await supabase
      .from('challenges')
      .select('location_name, location_country')
      .eq('event_id', eventId)
    const currentEventLocations = (existingEventChallenges ?? [])
      .filter(c => c.location_name)
      .map(c => c.location_country ? `${c.location_name}, ${c.location_country}` : c.location_name)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const isStreetView = STREET_VIEW_ROUNDS.includes(roundNumber)
    const prompt = isStreetView
      ? buildStreetViewPrompt(roundNumber, difficulty, existingLocations, eventTheme, currentEventLocations)
      : buildPrompt(roundNumber, difficulty, existingLocations, eventTheme, currentEventLocations)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let challengeData: any
    try {
      challengeData = JSON.parse(cleaned)
    } catch {
      return null
    }

    if (
      Math.abs(challengeData.location_lat ?? 0) < 0.001 &&
      Math.abs(challengeData.location_lng ?? 0) < 0.001
    ) return null

    // For Street View rounds, verify coverage exists before saving — the AI's
    // claim that a location has coverage is frequently wrong.
    if (isStreetView) {
      const hasCoverage = await verifyStreetView(challengeData.location_lat, challengeData.location_lng)
      if (!hasCoverage) return null
    }

    if (Array.isArray(challengeData.clues)) {
      const texts = challengeData.clues.map((c: any) => (c.text ?? '').trim().toLowerCase())
      const unique = new Set(texts)
      if (unique.size < texts.length || challengeData.clues.length < 2) return null
      challengeData.clues = challengeData.clues.map((c: any, idx: number) => ({ ...c, order: idx + 1 }))
    }

    // Country uniqueness check using pre-fetched event data (no second DB query)
    if (challengeData.location_country) {
      const countryLower = challengeData.location_country.toLowerCase().split('/')[0].trim()
      const isDuplicate = (existingEventChallenges ?? []).some(c => {
        const cLower = (c.location_country ?? '').toLowerCase().split('/')[0].trim()
        return cLower === countryLower || cLower.includes(countryLower) || countryLower.includes(cLower)
      })
      if (isDuplicate) return null
    }
    const { data, error } = await supabase.from('challenges').insert({
      ...challengeData,
      event_id: eventId,
      time_limit_seconds: 1800,
    }).select('id, location_name, location_country, location_lat, location_lng').maybeSingle()

    if (error || !data) return null

    // Insert hidden tokens inline — no external fetch needed
    const tokenCount = 2 + Math.floor(Math.random() * 3)
    const hints = [
      "Something glitters near the water's edge.",
      'Hidden where shadows fall at noon.',
      'Seek the forgotten corner of the map.',
      'Near where paths cross and diverge.',
      'Tucked beside an ancient boundary.',
    ]
    const tokens = Array.from({ length: tokenCount }, (_, i) => {
      const spread = 1 + Math.random() * 3
      const { dLat, dLng } = randomOffset(spread)
      return {
        challenge_id: data.id,
        lat: challengeData.location_lat + dLat,
        lng: challengeData.location_lng + dLng,
        radius_meters: 50,
        token_value: Math.random() > 0.7 ? 2 : 1,
        hint_text: hints[i % hints.length],
      }
    })
    await supabase.from('hidden_tokens').insert(tokens)

    return data.location_country
      ? `${data.location_name}, ${data.location_country}`
      : data.location_name
  } catch {
    return null
  }
}

// Retries on failure — handles transient AI errors, bad coordinates, banned-country picks,
// and (for Street View rounds) failed coverage verification. Street View rounds get more
// attempts since coverage rejection is a common, expected outcome, not a rare edge case.
export async function generateChallengeInline(params: {
  roundNumber: number
  difficulty: string
  eventId: string
  existingLocations: string[]
  eventTheme?: EventTheme
}): Promise<string | null> {
  const attempts = STREET_VIEW_ROUNDS.includes(params.roundNumber) ? 4 : 2
  for (let i = 0; i < attempts; i++) {
    const result = await tryGenerateOnce(params)
    if (result !== null) return result
  }
  return null
}

export async function getRecentExclusions(supabase: ReturnType<typeof getSupabase>): Promise<string[]> {
  const { data: recentEvents } = await supabase
    .from('monthly_events')
    .select('id')
    .eq('status', 'completed')
    .order('ends_at', { ascending: false })
    .limit(2)

  if (!recentEvents?.length) return []

  const { data: recentChallenges } = await supabase
    .from('challenges')
    .select('location_name, location_country')
    .in('event_id', recentEvents.map(e => e.id))

  return (recentChallenges ?? [])
    .filter(c => c.location_name)
    .map(c => c.location_country ? `${c.location_name}, ${c.location_country}` : c.location_name)
}

export { EVENT_THEMES }
