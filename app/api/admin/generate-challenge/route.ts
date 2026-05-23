import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const STREET_VIEW_ROUNDS = [1, 6, 11, 16]

function buildStreetViewPrompt(roundNumber: number, difficulty: string, existingLocations: string[]): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000 }
  const examples: Record<string, string> = {
    easy: 'How many red double-decker buses are visible on this stretch of Oxford Street?',
    medium: 'What is the color of the awning on the corner cafe?',
    hard: 'How many fishing boats are moored at this dock?',
    extreme: 'What animal is depicted on the sign above the entrance?',
  }
  return `You are the game master for "World Chase" â€” a competitive geography game.

Generate ONE Street View Observation challenge for Round ${roundNumber}, difficulty: ${difficulty.toUpperCase()}.

Pick a REAL, visually interesting street, square, market, or landmark that has OFFICIAL Google Street View car coverage (blue lines on Google Maps) â€” NOT user-contributed 360Â° photos. The location must have navigable street-level imagery with road arrows so players can walk along the street.
The observation question must be answerable by carefully looking at the Street View imagery.
Questions should be specific and have a clear, unambiguous answer.

DIFFICULTY GUIDE for observation questions:
- EASY: Count something obvious (vehicles, flags, signs of a specific color) on a world-famous street.
- MEDIUM: Identify something specific (color, word, symbol) on a recognizable but less-famous location.
- HARD: Count or identify something subtle on an obscure street or small town.
- EXTREME: Spot a tiny or hidden detail in a very remote or unusual location.

Example question for ${difficulty}: "${examples[difficulty]}"

DO NOT use any of these already-used locations: ${existingLocations.join(', ')}

Respond with ONLY valid JSON â€” no markdown:
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
  "riddle_text": "A one-sentence intro setting the scene dramatically. Do not give away the answer.",
  "clues": [
    {"order":1,"text":"Vague hint about what to look for"},
    {"order":2,"text":"Slightly more specific hint"},
    {"order":3,"text":"Clearer hint pointing to the answer"},
    {"order":4,"text":"Nearly explicit hint"}
  ],
  "answer_keywords": ["exact answer", "alternate phrasing"],
  "fun_fact": "One interesting fact about this location."
}`
}

function buildPrompt(roundNumber: number, difficulty: string, existingLocations: string[]): string {
  const pointsMap: Record<string, number> = { easy: 500, medium: 1000, hard: 2500, extreme: 5000 }
  return `You are the game master for "World Chase" â€” a brutal monthly geography competition where players pay real money for extra clues and race for a global leaderboard.

Generate ONE unique, extraordinary challenge for Round ${roundNumber}, difficulty: ${difficulty.toUpperCase()}.

DIFFICULTY GUIDE:
- EASY: Iconic global landmarks. Everyone knows them.
- MEDIUM: Remarkable but less globally-famous destinations.
- HARD: Genuinely obscure â€” remote towns, unusual geological features, niche cultural sites.
- EXTREME: The most forgotten, bizarre, inhospitable, or absurdly remote locations on Earth.

WRITING RULES:
- Riddle text must be literary, dramatic, poetic.
- NEVER name the location, country, or any direct identifier in the riddle.
- Clues must progress from HARDEST (1) to EASIEST (4).
- Map start distance from answer: easy=2â€“5km, medium=10â€“30km, hard=50â€“150km, extreme=200â€“500km
- The map_start must reflect the difficulty â€” hard and extreme should start in a completely different region or country.
- DO NOT use any of these already-used locations: ${existingLocations.join(', ')}

Respond with ONLY valid JSON â€” no markdown:
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
  "riddle_text": "3-5 sentence poetic riddle",
  "clues": [
    {"order":1,"text":"hardest clue"},
    {"order":2,"text":"medium clue"},
    {"order":3,"text":"easier clue"},
    {"order":4,"text":"easiest clue â€” almost explicit"}
  ],
  "answer_keywords": ["primary","alternate spelling","landmark name"],
  "fun_fact": "One astonishing fact about this location."
}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile.data?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { roundNumber, difficulty, eventId, existingLocations = [] } = await req.json()

    const isStreetViewRound = STREET_VIEW_ROUNDS.includes(roundNumber)
    const prompt = isStreetViewRound
      ? buildStreetViewPrompt(roundNumber, difficulty, existingLocations)
      : buildPrompt(roundNumber, difficulty, existingLocations)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const challengeData = JSON.parse(cleaned)

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await service.from('challenges').insert({
      ...challengeData, event_id: eventId, time_limit_seconds: 1800,
    }).select().single()

    if (error) throw error

    const tokenCount = 2 + Math.floor(Math.random() * 3)
    await fetch(`${req.nextUrl.origin}/api/admin/generate-hidden-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
