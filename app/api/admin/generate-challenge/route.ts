import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NARRATIVE_STYLES } from '@/lib/eventThemes'
import type { EventTheme } from '@/lib/eventThemes'

export const dynamic = 'force-dynamic'

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

function buildStreetViewPrompt(roundNumber: number, difficulty: string, existingLocations: string[], eventTheme?: EventTheme): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000, pro: 10000 }
  const narrativeStyle = NARRATIVE_STYLES[(roundNumber - 1) % NARRATIVE_STYLES.length]
  const themeSection = eventTheme
    ? `\nEVENT THEME: "${eventTheme.label}" — ${eventTheme.description}
REQUIRED REGION FOCUS: ${eventTheme.regionFocus}
AVOID: ${eventTheme.avoidRegions}\n`
    : ''

  return `You are the game master for "World Chase" — a competitive geography game.
${themeSection}
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
    {"order":3,"text":"[Direction: clear instruction, e.g. 'walk forward and look above the archway'] + [Observation: clear hint]"},
    {"order":4,"text":"[Direction: explicit, e.g. 'face the main facade and look at the upper windows'] + [Observation: nearly explicit answer]"}
  ],
  "answer_keywords": ["exact answer", "alternate phrasing"],
  "fun_fact": "One interesting fact about this location."
}`
}

function buildPrompt(roundNumber: number, difficulty: string, existingLocations: string[], eventTheme?: EventTheme): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000, pro: 10000 }
  const narrativeStyle = NARRATIVE_STYLES[(roundNumber - 1) % NARRATIVE_STYLES.length]
  const themeSection = eventTheme
    ? `\nEVENT THEME: "${eventTheme.label}" — ${eventTheme.description}
REQUIRED REGION FOCUS: ${eventTheme.regionFocus}
AVOID: ${eventTheme.avoidRegions}\n`
    : ''

  return `You are the game master for "World Chase" — a brutal weekly geography competition where players pay real money for extra clues and race for a global leaderboard.
${themeSection}
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

export async function POST(req: NextRequest) {
  try {
    // Allow internal cron calls via x-cron-secret header
    const cronSecret = process.env.CRON_SECRET
    const isCronCall = cronSecret && req.headers.get('x-cron-secret') === cronSecret

    if (!isCronCall) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const profile = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (!profile.data?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { roundNumber, difficulty, eventId, existingLocations = [], eventTheme, eventName } = await req.json()

    if (!['easy', 'medium', 'hard', 'extreme', 'pro'].includes(difficulty))
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
    if (!roundNumber || !eventId)
      return NextResponse.json({ error: 'Missing roundNumber or eventId' }, { status: 400 })

    const isStreetViewRound = STREET_VIEW_ROUNDS.includes(roundNumber)
    const prompt = isStreetViewRound
      ? buildStreetViewPrompt(roundNumber, difficulty, existingLocations, eventTheme)
      : buildPrompt(roundNumber, difficulty, existingLocations, eventTheme)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let challengeData: any
    try {
      challengeData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON — regenerate' }, { status: 422 })
    }

    // Reject placeholder 0,0 coordinates
    if (
      Math.abs(challengeData.location_lat ?? 0) < 0.001 &&
      Math.abs(challengeData.location_lng ?? 0) < 0.001
    ) {
      return NextResponse.json({ error: 'AI returned zero coordinates — regenerate' }, { status: 422 })
    }

    // For Street View rounds, verify coverage exists before saving
    if (isStreetViewRound) {
      const hasCoverage = await verifyStreetView(challengeData.location_lat, challengeData.location_lng)
      if (!hasCoverage) {
        return NextResponse.json({ error: 'No Street View coverage at AI coordinates — regenerate' }, { status: 422 })
      }
    }

    // Validate clues — reject if the AI returned duplicates or no distinct texts
    if (Array.isArray(challengeData.clues)) {
      const texts = challengeData.clues.map((c: any) => (c.text ?? '').trim().toLowerCase())
      const unique = new Set(texts)
      if (unique.size < texts.length) {
        return NextResponse.json({ error: 'AI returned duplicate clue texts — regenerate this challenge.' }, { status: 422 })
      }
      if (challengeData.clues.length < 2) {
        return NextResponse.json({ error: 'AI returned too few clues — regenerate this challenge.' }, { status: 422 })
      }
      // Normalise order values to 1-indexed sequential integers regardless of AI output
      challengeData.clues = challengeData.clues.map((c: any, idx: number) => ({ ...c, order: idx + 1 }))
    }

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await service.from('challenges').insert({
      ...challengeData, event_id: eventId, time_limit_seconds: 1800,
    }).select().maybeSingle()

    if (error) throw error

    const tokenCount = 2 + Math.floor(Math.random() * 3)
    await fetch(`${req.nextUrl.origin}/api/admin/generate-hidden-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({
        challengeId: data.id,
        centerLat: challengeData.location_lat,
        centerLng: challengeData.location_lng,
        count: tokenCount,
      }),
    })

    return NextResponse.json({ challenge: data })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error', detail: String(err) }, { status: 500 })
  }
}
