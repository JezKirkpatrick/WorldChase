import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

const VALID_WAGERS = [10, 25, 50, 100]
type MatchType = 'open' | 'friend_invite'

function wagerToDifficulty(wager: number) {
  if (wager >= 100) return 'extreme'
  if (wager >= 50)  return 'hard'
  if (wager >= 25)  return 'medium'
  return 'easy'
}

async function generateVsChallenge(admin: any, wager: number): Promise<{ id: string } | { _error: string }> {
  const difficulty = wagerToDifficulty(wager)

  const { data: anyEvent } = await admin
    .from('monthly_events').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!anyEvent) return { _error: 'no_active_event' }

  const mapDistance: Record<string, string> = {
    easy: '2–5 km', medium: '10–30 km', hard: '50–150 km', extreme: '200–500 km',
  }

  const prompt = `You are the game master for WorldChase — a 1v1 geography duel. Generate ONE unique geography challenge, difficulty: ${difficulty.toUpperCase()}.

DIFFICULTY:
- EASY: World's most iconic landmarks (Eiffel Tower, Big Ben, Colosseum, etc). Map starts ${mapDistance[difficulty]} away.
- MEDIUM: Remarkable but less globally-famous destinations. Map starts ${mapDistance[difficulty]} away.
- HARD: Genuinely obscure — remote towns, unusual geology, niche cultural sites. Map starts ${mapDistance[difficulty]} away.
- EXTREME: Most forgotten, bizarre, or remote locations on Earth. Map starts ${mapDistance[difficulty]} away.

RULES: Riddle must never name the location. Clues: 1=hardest → 4=almost explicit.

Respond with ONLY valid JSON — no markdown, no commentary:
{"round_number":1,"difficulty":"${difficulty}","location_name":"official name","location_country":"country","location_lat":0.0,"location_lng":0.0,"map_start_lat":0.0,"map_start_lng":0.0,"street_view_heading":0,"street_view_pitch":0,"street_view_only":false,"street_view_question":null,"points_value":${wager * 10},"riddle_text":"3–5 sentence poetic riddle","clues":[{"order":1,"text":"hardest clue"},{"order":2,"text":"medium clue"},{"order":3,"text":"easier clue"},{"order":4,"text":"easiest clue"}],"answer_keywords":["primary answer","alternate spelling"],"fun_fact":"One interesting fact."}`

  let challengeData: any
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    challengeData = JSON.parse(cleaned)
  } catch (err: any) {
    console.error('VS challenge generation failed:', err)
    return { _error: `ai_failed: ${err?.message ?? String(err)}` }
  }

  if (Array.isArray(challengeData.clues)) {
    challengeData.clues = challengeData.clues.map((c: any, i: number) => ({ ...c, order: i + 1 }))
  }

  // Use Unix-seconds timestamp as round_number — avoids the unique(event_id, round_number)
  // constraint collision since all VS challenges share the same event_id
  challengeData.round_number = Math.floor(Date.now() / 1000)

  const { data: challenge, error: insertErr } = await admin
    .from('challenges')
    .insert({ ...challengeData, event_id: anyEvent.id, time_limit_seconds: 1800 })
    .select('id')
    .single()

  if (insertErr) {
    console.error('VS challenge insert failed:', insertErr)
    return { _error: `db_insert: ${insertErr.message} | code: ${insertErr.code}` }
  }

  return challenge
}

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { wager, matchType = 'open', friendId } = await req.json()
  if (!VALID_WAGERS.includes(wager)) {
    return NextResponse.json({ error: 'Invalid wager amount' }, { status: 400 })
  }
  if (!['open', 'friend_invite'].includes(matchType)) {
    return NextResponse.json({ error: 'Invalid match type' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < wager) {
    return NextResponse.json({ error: `Not enough tokens (need ${wager}, have ${profile?.tokens ?? 0})` }, { status: 400 })
  }

  if (matchType === 'friend_invite') {
    if (!friendId) return NextResponse.json({ error: 'Friend ID required for friend invite' }, { status: 400 })
    if (friendId === user.id) return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 })

    const { data: friendship } = await admin
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!friendship) return NextResponse.json({ error: 'You are not friends with this player' }, { status: 403 })
  }

  // Generate a fresh challenge specifically for this VS duel
  const challengeResult = await generateVsChallenge(admin, wager)
  if ('_error' in challengeResult) {
    return NextResponse.json({ error: 'Failed to generate challenge', detail: challengeResult._error }, { status: 500 })
  }
  const challenge = challengeResult

  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -wager }),
    admin.from('token_transactions').insert({
      user_id: user.id, type: 'vs_wager', amount: -wager,
      description: `VS Duel — wager staked (${wager} tokens)`,
    }),
  ])

  const expiresAt = matchType === 'friend_invite'
    ? new Date(Date.now() + 2 * 60 * 1000).toISOString()   // 2 minutes for friend invites
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours for open challenges

  const insertData: Record<string, unknown> = {
    challenge_id: challenge.id,
    challenger_id: user.id,
    wager,
    match_type: matchType,
    expires_at: expiresAt,
  }
  if (matchType === 'friend_invite' && friendId) {
    insertData.invited_friend_id = friendId
  }

  const { data: match, error } = await admin
    .from('vs_matches').insert(insertData).select('id').single()

  if (error || !match) {
    console.error('vs_matches insert failed:', error)
    await admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: wager })
    return NextResponse.json({ error: 'Failed to create duel', detail: error?.message ?? 'unknown' }, { status: 500 })
  }

  return NextResponse.json({ matchId: match.id })
}
