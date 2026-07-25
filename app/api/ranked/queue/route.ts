import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import {
  getArenaChallengeDifficulty,
  DIFFICULTY_CONFIG,
  MATCH_CAPACITY,
  ARENA_WAGERS,
} from '@/lib/arenas'

export const dynamic = 'force-dynamic'

async function generateArenaChallenge(admin: any, arenaLevel: number): Promise<{ id: string } | { _error: string }> {
  const diffKey = getArenaChallengeDifficulty(arenaLevel)
  const timeLimit = DIFFICULTY_CONFIG[diffKey].timeLimit

  const { data: anyEvent } = await admin
    .from('monthly_events')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!anyEvent) return { _error: 'no_active_event' as const }

  const mapDist: Record<string, string> = {
    easy: '2–5 km', medium: '10–30 km', hard: '50–150 km', extreme: '200–500 km',
  }

  const prompt = `You are the game master for WorldChase Arena — a competitive geography battle. Generate ONE unique geography challenge, difficulty: ${diffKey.toUpperCase()}.

DIFFICULTY GUIDE:
- EASY: World-famous iconic landmarks. Map starts ${mapDist[diffKey]} away.
- MEDIUM: Remarkable but less globally-famous destinations. Map starts ${mapDist[diffKey]} away.
- HARD: Genuinely obscure — remote towns, unusual geology, niche cultural sites. Map starts ${mapDist[diffKey]} away.
- EXTREME: Most forgotten, bizarre, or remote locations on Earth. Map starts ${mapDist[diffKey]} away.

Rules: riddle must NEVER name the location. Clues go from hardest (1) to easiest (4).

Respond with ONLY valid JSON, no markdown:
{"round_number":1,"difficulty":"${diffKey}","location_name":"official name","location_country":"country","location_lat":0.0,"location_lng":0.0,"map_start_lat":0.0,"map_start_lng":0.0,"street_view_heading":0,"street_view_pitch":0,"street_view_only":false,"street_view_question":null,"points_value":100,"riddle_text":"3-5 sentence poetic riddle","clues":[{"order":1,"text":"hardest clue"},{"order":2,"text":"medium clue"},{"order":3,"text":"easier clue"},{"order":4,"text":"easiest clue"}],"answer_keywords":["primary answer","alternate spelling"],"fun_fact":"One interesting fact about this place."}`

  let challengeData: any
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    challengeData = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim())
  } catch (err: any) {
    return { _error: `ai_failed: ${err?.message ?? String(err)}` as const }
  }

  if (Array.isArray(challengeData.clues)) {
    challengeData.clues = challengeData.clues.map((c: any, i: number) => ({ ...c, order: i + 1 }))
  }
  challengeData.round_number = Math.floor(Date.now() / 1000)

  const { data: challenge, error } = await admin
    .from('challenges')
    .insert({ ...challengeData, event_id: anyEvent.id, time_limit_seconds: timeLimit })
    .select('id')
    .single()

  if (error) return { _error: `db_insert: ${error.message}` as const }
  return challenge as { id: string }
}

// POST — join matchmaking queue
export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { format } = await req.json()
  if (!['1v1', '2v2', 'ffa5'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user's arena level
  const { data: progress } = await admin
    .from('arena_progress')
    .select('current_arena, trophies')
    .eq('user_id', user.id)
    .maybeSingle()

  const arenaLevel: number = progress?.current_arena ?? 1
  const wager = ARENA_WAGERS[arenaLevel]
  const capacity = MATCH_CAPACITY[format]

  // Validate tokens
  const { data: profile } = await admin
    .from('profiles').select('tokens').eq('id', user.id).maybeSingle()
  if (!profile || profile.tokens < wager) {
    return NextResponse.json({ error: `Need ${wager} tokens for Arena ${arenaLevel}` }, { status: 400 })
  }

  // Check not already in a match
  const { data: myMatches } = await admin
    .from('ranked_match_players')
    .select('match_id')
    .eq('user_id', user.id)
    .limit(10)

  if (myMatches && myMatches.length > 0) {
    const ids = myMatches.map((r: any) => r.match_id)
    const { data: activeMatch } = await admin
      .from('ranked_matches')
      .select('id')
      .in('id', ids)
      .in('status', ['waiting', 'active'])
      .limit(1)
      .maybeSingle()
    if (activeMatch) {
      return NextResponse.json({ matchId: activeMatch.id, alreadyQueued: true })
    }
  }

  const now = new Date().toISOString()

  // Find open waiting match (same arena + format, not private invite, not expired)
  const { data: openMatches } = await admin
    .from('ranked_matches')
    .select('id')
    .eq('arena_level', arenaLevel)
    .eq('format', format)
    .eq('status', 'waiting')
    .is('invited_user_id', null)
    .order('created_at', { ascending: true })
    .limit(10)

  if (openMatches && openMatches.length > 0) {
    for (const candidate of openMatches) {
      const { count } = await admin
        .from('ranked_match_players')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', candidate.id)

      const currentCount = count ?? 0
      if (currentCount >= capacity) continue

      const team = format === '2v2' ? ((currentCount % 2) + 1) : null

      await admin.from('ranked_match_players').insert({ match_id: candidate.id, user_id: user.id, team })

      const newCount = currentCount + 1
      if (newCount >= capacity) {
        await admin.from('ranked_matches')
          .update({ status: 'active', started_at: now })
          .eq('id', candidate.id)
        return NextResponse.json({ matchId: candidate.id, waiting: false })
      }

      return NextResponse.json({ matchId: candidate.id, waiting: true })
    }
  }

  // No open match — create one with a challenge
  const result = await generateArenaChallenge(admin, arenaLevel)
  if ('_error' in result) {
    return NextResponse.json({ error: 'Challenge generation failed', detail: result._error }, { status: 500 })
  }

  const { data: match, error: matchErr } = await admin
    .from('ranked_matches')
    .insert({ format, arena_level: arenaLevel, status: 'waiting', challenge_id: result.id })
    .select('id')
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }

  const team = format === '2v2' ? 1 : null
  await admin.from('ranked_match_players').insert({ match_id: match.id, user_id: user.id, team })

  return NextResponse.json({ matchId: match.id, waiting: true })
}

// DELETE — leave queue / cancel waiting match
export async function DELETE(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await req.json()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin
    .from('ranked_matches').select('status').eq('id', matchId).maybeSingle()

  if (!match || match.status !== 'waiting') {
    return NextResponse.json({ error: 'Match not cancellable' }, { status: 400 })
  }

  await admin.from('ranked_match_players').delete().eq('match_id', matchId).eq('user_id', user.id)

  const { count } = await admin
    .from('ranked_match_players').select('id', { count: 'exact', head: true }).eq('match_id', matchId)

  if ((count ?? 0) === 0) {
    await admin.from('ranked_matches').update({ status: 'cancelled' }).eq('id', matchId)
  }

  return NextResponse.json({ success: true })
}
