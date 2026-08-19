import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NARRATIVE_STYLES } from '@/lib/eventThemes'
import type { EventTheme } from '@/lib/eventThemes'

export const dynamic = 'force-dynamic'
// No default here meant Vercel's plan default (well under 300s) — the new Street View
// content-verification step (image fetch + vision call) adds real per-attempt latency,
// so make the ceiling explicit rather than risk a slow single attempt timing out.
export const maxDuration = 300

const STREET_VIEW_ROUNDS = [1, 6, 11, 16]

// Haversine distance in metres — used to check the matched panorama is actually
// close to the requested spot, not just "some outdoor coverage exists somewhere nearby".
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Verify Street View coverage via Google's free Metadata API before saving the challenge.
// Returns true if coverage exists close enough to actually represent the intended spot
// (or if the check itself fails — fail open). A location like a pedestrian-only bridge
// can return "OK" from a wide-radius search while the real matched panorama sits on an
// unrelated street blocks away — status OK alone isn't proof the location is right, the
// matched pano's own distance from the requested coordinates is.
async function verifyStreetView(lat: number, lng: number): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return true
  try {
    for (const radius of [50, 150, 500]) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${radius}&source=outdoor&key=${key}`,
        { headers: { Referer: 'https://worldchase.net' } }
      )
      const data = await res.json()
      if (data.status === 'OK' && data.location) {
        const matchedDistance = distanceMetres(lat, lng, data.location.lat, data.location.lng)
        if (matchedDistance <= 75) return true
      }
      if (radius === 500 && data.status === 'ZERO_RESULTS') return false
    }
    return false
  } catch {
    return true // network error — fail open so generation isn't blocked
  }
}

// Verify the panorama actually SHOWS what the riddle/question describes, not just that
// coverage exists nearby — geometry checks above pass locations where the matched pano
// is real, close, and navigable, but simply doesn't frame the scene the AI wrote about.
async function verifyStreetViewContent(
  lat: number, lng: number, heading: number, pitch: number,
  question: string, riddleText: string
): Promise<boolean> {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!mapsKey) return true
  try {
    const imgRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=90&key=${mapsKey}`
    )
    if (!imgRes.ok) return true
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const base64 = buf.toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `This is the exact Google Street View frame a player will see for a geography game round. The player must answer this by looking at ONLY this image: "${question}"\nScene the game claims this is: "${riddleText}"\nIs the described object/scene actually visible and answerable from this exact frame — not "probably nearby" or "would be visible if rotated", but literally in this image? Reply with ONLY JSON, no markdown: {"visible": true or false, "reason": "one short sentence"}` }
        ]
      }] as any,
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed.visible === true
  } catch {
    return true // vision check itself failing shouldn't block generation — fail open
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

DIFFICULTY GUIDE for observation questions — this game is for the GENERAL PUBLIC, not geography experts. EASY and MEDIUM must be genuinely easy:
- EASY: A world-famous street, boulevard, or plaza in a major tourist city (Paris, Tokyo, New York, London, Sydney, Rome, etc.) that a school-age child would recognise by name. Count something large, obvious, and impossible to miscount (e.g. how many traffic lights are visible, how many flags on the building ahead). Answer must be a simple small number (1–9). Do not require the player to look closely or notice something subtle — it should be visible at a glance.
- MEDIUM: Identify something specific (color, word, symbol) on a recognizable but less-famous location in a well-covered country. Still findable within a few seconds of looking in the right direction, not a close inspection.
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

DIFFICULTY GUIDE — this game is for the GENERAL PUBLIC, not geography experts. Most players never get past the early rounds, so EASY and MEDIUM must be genuinely easy, not "easy for a geography buff":
- EASY: Only the handful of landmarks a school-age child could name on sight, even having never traveled — Eiffel Tower, Statue of Liberty, Great Wall of China, Sydney Opera House, Big Ben, Colosseum, Taj Mahal, Pyramids of Giza, Christ the Redeemer, Golden Gate Bridge, Mount Fuji. If you have to think twice about whether an average person would know it, it is NOT easy — pick something more famous.
- MEDIUM: A well-known destination most well-travelled adults would recognise from photos or movies, but a notch below the EASY tier's global fame — still a "yes I've heard of that" reaction, not a "never heard of it."
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

    // round_number/difficulty/street_view_only are deterministic from the request —
    // never trust the AI's copy of them, it sometimes gets street_view_only wrong
    // even when the generated question/riddle content is correctly street-view-style.
    challengeData.round_number = roundNumber
    challengeData.difficulty = difficulty
    challengeData.street_view_only = isStreetViewRound

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

      const contentMatches = await verifyStreetViewContent(
        challengeData.location_lat, challengeData.location_lng,
        challengeData.street_view_heading ?? 0, challengeData.street_view_pitch ?? 0,
        challengeData.street_view_question ?? '', challengeData.riddle_text ?? ''
      )
      if (!contentMatches) {
        return NextResponse.json({ error: 'AI scene does not match what is actually visible at these coordinates — regenerate' }, { status: 422 })
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
