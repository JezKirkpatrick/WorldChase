import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  ARENA_WAGERS, MATCH_CAPACITY,
  getArenaChallengeDifficulty, DIFFICULTY_CONFIG,
} from '@/lib/arenas'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { format } = await req.json() as { format: string }
    if (!['1v1', '2v2', 'ffa5'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Get arena progress (default to arena 1 if none)
    const { data: progress } = await service
      .from('arena_progress')
      .select('current_arena, trophies')
      .eq('user_id', user.id)
      .maybeSingle()

    const arenaLevel = progress?.current_arena ?? 1
    const wager = ARENA_WAGERS[arenaLevel]
    const capacity = MATCH_CAPACITY[format]

    // Check balance
    const { data: profile } = await service
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .single()

    if ((profile?.tokens ?? 0) < wager) {
      return NextResponse.json({ error: `Need ${wager} tokens to enter this arena` }, { status: 400 })
    }

    // Deduct wager immediately
    await service
      .from('profiles')
      .update({ tokens: profile!.tokens - wager })
      .eq('id', user.id)

    await service.from('token_transactions').insert({
      user_id: user.id,
      type: 'ranked_queue_hold',
      amount: -wager,
      description: `Ranked ${format} wager — arena ${arenaLevel}`,
    })

    // Find an open waiting match
    const { data: existing } = await service
      .from('ranked_matches')
      .select('id, ranked_match_players(id, team)')
      .eq('format', format)
      .eq('arena_level', arenaLevel)
      .eq('status', 'waiting')
      .limit(10)

    let matchId: string | null = null
    let team: number | null = null

    for (const m of existing ?? []) {
      const players = (m.ranked_match_players as any[]) ?? []
      if (players.length < capacity) {
        matchId = m.id
        // For 2v2, assign to team with fewer players
        if (format === '2v2') {
          const t1 = players.filter(p => p.team === 1).length
          const t2 = players.filter(p => p.team === 2).length
          team = t1 <= t2 ? 1 : 2
        }
        break
      }
    }

    if (!matchId) {
      // Create new match
      const { data: newMatch, error: matchErr } = await service
        .from('ranked_matches')
        .insert({ format, arena_level: arenaLevel, status: 'waiting' })
        .select('id')
        .single()

      if (matchErr || !newMatch) throw matchErr ?? new Error('Failed to create match')
      matchId = newMatch.id
      if (format === '2v2') team = 1
    }

    // Add player to match
    await service.from('ranked_match_players').insert({
      match_id: matchId,
      user_id: user.id,
      team: team ?? null,
    })

    // Check if match is now full
    const { count } = await service
      .from('ranked_match_players')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)

    let status = 'waiting'

    if ((count ?? 0) >= capacity) {
      // Assign a challenge and activate
      const difficulty = getArenaChallengeDifficulty(arenaLevel)
      const { data: pool } = await service
        .from('challenges')
        .select('id')
        .eq('difficulty', difficulty)
        .limit(50)

      let challengeId: string | null = null
      if (pool && pool.length > 0) {
        challengeId = pool[Math.floor(Math.random() * pool.length)].id
      }

      await service.from('ranked_matches').update({
        status: 'active',
        challenge_id: challengeId,
      }).eq('id', matchId)

      status = 'active'
    }

    return NextResponse.json({ matchId, status })
  } catch (err: any) {
    console.error('[ranked/queue]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
