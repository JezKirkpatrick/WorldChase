import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NARRATIVE_STYLES, EVENT_THEMES } from '@/lib/eventThemes'
import type { EventTheme } from '@/lib/eventThemes'

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

// map_start distance from the answer, per difficulty (see prompt text below) — the AI
// frequently ignores this instruction outright (observed live: "medium" rounds landing
// on a different continent, thousands of km off a 10-30km target), so it's enforced
// deterministically here rather than trusted from the model's output.
const MAP_START_RANGE_KM: Record<string, [number, number]> = {
  easy: [2, 5], medium: [10, 30], hard: [50, 150], extreme: [200, 500], pro: [3000, 15000],
}

function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const phi1 = toRad(lat1), phi2 = toRad(lat2)
  const dLambda = toRad(lng2 - lng1)
  const y = Math.sin(dLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda)
  return Math.atan2(y, x)
}

// Given a start point, bearing (radians), and distance, compute the destination point —
// used to correct an out-of-range map_start while preserving the AI's chosen direction.
function destinationPoint(lat1: number, lng1: number, bearingRad: number, distanceKm: number): { lat: number; lng: number } {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const d = distanceKm / R
  const phi1 = toRad(lat1), lam1 = toRad(lng1)
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(bearingRad))
  const lam2 = lam1 + Math.atan2(Math.sin(bearingRad) * Math.sin(d) * Math.cos(phi1), Math.cos(d) - Math.sin(phi1) * Math.sin(phi2))
  return { lat: toDeg(phi2), lng: toDeg(lam2) }
}

// Verify the panorama actually SHOWS what the riddle/question describes, not just that
// coverage exists nearby. verifyStreetView() below only checks geometry (is there a
// navigable pano close to these coordinates) — it has repeatedly passed locations where
// the matched pano is real, close, and navigable, but simply doesn't frame the scene the
// AI wrote about (an indoor gallery, a side alley instead of the main street, a street
// instead of the bridge it claims to be). This checks the actual pixels at the exact
// heading/pitch the player will see against the claimed content, closing that gap.
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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `This is the exact Google Street View frame a player will see for a geography game round. The player must answer this by looking at ONLY this image: "${question}"\nScene the game claims this is: "${riddleText}"\nIs the described object/scene actually visible and answerable from this exact frame — not "probably nearby" or "would be visible if rotated", but literally in this image? Reply with ONLY JSON, no markdown: {"visible": true or false, "reason": "one short sentence"}` }
        ]
      }]
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed.visible === true
  } catch {
    return true // vision check itself failing shouldn't block generation — fail open
  }
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
    // Tight radius first — if coverage exists this close, it's genuinely at the spot.
    for (const radius of [50, 150, 500]) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${radius}&source=outdoor&key=${key}`,
        { headers: { Referer: 'https://worldchase.net' } }
      )
      const data = await res.json()
      if (data.status === 'OK' && data.location) {
        const matchedDistance = distanceMetres(lat, lng, data.location.lat, data.location.lng)
        // Only accept if the matched panorama is close enough that it will actually
        // show the intended landmark, not just "the nearest drivable street".
        if (matchedDistance <= 75) return true
      }
      if (radius === 500 && data.status === 'ZERO_RESULTS') return false
    }
    return false
  } catch {
    return true // network error — fail open so generation isn't blocked
  }
}

// Rebalanced after user feedback ("too hard for the normal public, only good for geo
// experts") — real-player data showed most non-admin signups stalled after round 1-2.
// Old curve was 5 easy / 5 medium / 5 hard / 10(!) extreme. New curve front-loads more
// genuinely-easy rounds and shrinks the brutal extreme tail, restoring the unused "pro"
// tier (already fully supported in scoring/UI) for just the last 2 rounds.
export const DIFFICULTY_FOR_ROUND = (round: number): string =>
  round <= 8 ? 'easy' : round <= 14 ? 'medium' : round <= 19 ? 'hard' : round <= 23 ? 'extreme' : 'pro'

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

CRITICAL — MATCH THE VIEW TO THE QUESTION: This is the single most common reason generations get rejected. Before writing the question, think about what the exact heading/pitch will actually show:
- If asking about something near the TOP of a tall structure (flags, a spire, an upper floor, a clock face), you are usually standing too close and too low to see it — either pick coordinates far enough away that the whole structure fits in frame, or set street_view_pitch noticeably upward (20-40) and confirm the top is genuinely in view at that distance.
- NEVER ask about a feature "at the very top" of something while standing directly at its base — from directly underneath, the top is rarely visible at all.
- If asking about the EXTERIOR (entrance doors, facade colour, outer walls), make sure the coordinates are actually outside the building, not inside it — many famous landmarks have Street View coverage from interior tours (museum halls, church naves, station platforms) mixed in with the outdoor coverage.
- If asking about STREET-LEVEL details (road markings, crossing colours, pavement), make sure the coordinates are on the open street, not inside a subway station, tunnel, or underpass — famous plazas and crossings often have underground transit coverage nearby that looks similar in search results but shows a completely different scene.
- When in doubt, pick a question about something clearly at ground level, facing outward on an open street — these are the most reliable to verify.

The observation question must be answerable by carefully looking at the Street View imagery. Questions should be specific with a clear, unambiguous answer.

CRITICAL — NO VAGUE QUESTIONS: street_view_question must target ONE specific, nameable detail — an exact count, an exact word/brand/color/symbol. NEVER a broad, open-ended question like "What covers the buildings?" or "What do you see around you?" — a vague question gives the player no idea what format of answer is even expected, and there is no single correct answer to grade against. If the question is a count, the underlying object must be countable at a glance without ambiguity — avoid counting things where the real number varies wildly depending on how far the player looks (e.g. never "how many billboards/screens/signs" in a visually saturated, densely-signed scene — pick a single named element there instead, like a specific brand name or word visible on one sign). Clue 4 (the final clue) MUST literally state the exact correct answer in plain words, not just hint at it — the player should never finish reading clue 4 still unsure what to type.

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
  "riddle_text": "A one-sentence intro setting the scene in the specified narrative style. Must NOT pose its own question or ask the player to count/spot/find anything — street_view_question is the only graded question. Do not give away the answer.",
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

    // round_number/difficulty/street_view_only are deterministic from the caller —
    // never trust the AI's copy of them, it sometimes gets street_view_only wrong
    // even when the generated question/riddle content is correctly street-view-style.
    challengeData.round_number = roundNumber
    challengeData.difficulty = difficulty
    challengeData.street_view_only = isStreetView

    if (
      Math.abs(challengeData.location_lat ?? 0) < 0.001 &&
      Math.abs(challengeData.location_lng ?? 0) < 0.001
    ) return null

    // Street View rounds start the player directly in Street View at the answer's own
    // coordinates — map_start distance rules below only apply to draggable-map rounds.
    if (!isStreetView) {
      const [minKm, maxKm] = MAP_START_RANGE_KM[difficulty] ?? [10, 30]
      const actualKm = distanceMetres(
        challengeData.location_lat, challengeData.location_lng,
        challengeData.map_start_lat, challengeData.map_start_lng
      ) / 1000
      if (actualKm < minKm || actualKm > maxKm) {
        const bearing = bearingDegrees(
          challengeData.location_lat, challengeData.location_lng,
          challengeData.map_start_lat, challengeData.map_start_lng
        )
        const targetKm = (minKm + maxKm) / 2
        const corrected = destinationPoint(challengeData.location_lat, challengeData.location_lng, bearing, targetKm)
        challengeData.map_start_lat = corrected.lat
        challengeData.map_start_lng = corrected.lng
      }
    }

    // answer_keywords must be a non-empty list of real strings — an empty/malformed
    // list means quick keyword matching can never succeed and every guess falls
    // through to the AI judge, which is slower and was the root cause of a real
    // grading bug (judge fell back to comparing against location_name instead).
    if (
      !Array.isArray(challengeData.answer_keywords) ||
      challengeData.answer_keywords.length === 0 ||
      challengeData.answer_keywords.some((k: any) => typeof k !== 'string' || !k.trim())
    ) return null

    // riddle_text is flavour text only — street_view_question is the sole graded
    // question. A "?" here means the AI wrote a competing question (found live:
    // riddle asked "how many lampposts" while the graded answer was letters
    // carved on a nearby monument), which misleads players into answering the
    // wrong thing. Cheap check, run before the expensive Street View calls below
    // so a bad generation is rejected without burning a Google/vision API call.
    if (isStreetView && String(challengeData.riddle_text ?? '').includes('?')) return null

    // For Street View rounds, verify coverage exists before saving — the AI's
    // claim that a location has coverage is frequently wrong.
    if (isStreetView) {
      const hasCoverage = await verifyStreetView(challengeData.location_lat, challengeData.location_lng)
      if (!hasCoverage) return null

      const contentMatches = await verifyStreetViewContent(
        challengeData.location_lat, challengeData.location_lng,
        challengeData.street_view_heading ?? 0, challengeData.street_view_pitch ?? 0,
        challengeData.street_view_question ?? '', challengeData.riddle_text ?? ''
      )
      if (!contentMatches) return null
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

    // Exact-landmark duplicate check — belt-and-braces alongside the country check
    // above. The country check alone failed to stop the same landmark (e.g. Christ
    // the Redeemer) being picked for multiple rounds when two generation crons ran
    // concurrently against the same event, each working from a stale snapshot.
    if (challengeData.location_name) {
      const nameLower = String(challengeData.location_name).toLowerCase().trim()
      const isNameDuplicate = (existingEventChallenges ?? []).some(
        c => (c.location_name ?? '').toLowerCase().trim() === nameLower
      )
      if (isNameDuplicate) return null
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
