import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import { ARENA_WAGERS, MATCH_CAPACITY } from '@/lib/arenas'

export const dynamic = 'force-dynamic'

function keywordMatch(guess: string, keywords: string[]): boolean {
  const g = guess.toLowerCase().trim()
  return keywords.some(k => {
    const kw = k.toLowerCase().trim()
    return g === kw || g.includes(kw) || kw.includes(g)
  })
}

function calcScore(correct: boolean, timeSeconds: number, cluesUsed: number): number {
  if (!correct) return 0
  return Math.max(0, 1000 - cluesUsed * 50 - timeSeconds)
}

async function judgeAnswer(
  answer: string,
  locationName: string,
  locationCountry: string,
  keywords: string[]
): Promise<{ correct: boolean; feedback: string }> {
  if (!answer.trim()) return { correct: false, feedback: 'Time\'s up — no answer submitted.' }

  if (keywordMatch(answer, keywords)) {
    return { correct: true, feedback: 'Confirmed! Razor-sharp instincts.' }
  }

  const aiRes = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `Geography game judge. Correct location: "${locationName}, ${locationCountry}". Keywords: ${JSON.stringify(keywords)}. Player answered: "${answer}". Is this correct? Be generous with spelling/transliterations. Reply ONLY valid JSON: {"is_correct":true,"feedback":"one energetic sentence — congratulate if correct, tiny non-spoiler nudge if wrong, never reveal answer"}`,
    }],
  })

  const raw = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const result = JSON.parse(cleaned)
  return { correct: !!result.is_correct, feedback: result.feedback ?? '' }
}

async function completeMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  matchId: string,
  format: string,
  arenaLevel: number,
  players: any[]
) {
  const wager = ARENA_WAGERS[arenaLevel]

  // ── Determine results ────────────────────────────────────────
  type PlayerResult = {
    entryId: string
    userId: string
    result: 'win' | 'loss' | 'refund'
    tokenReturn: number     // tokens to add back (on top of already-deducted wager)
    netTokenChange: number  // net from player's perspective (positive = profit, negative = loss)
    opponentElo?: number
  }

  let results: PlayerResult[] = []

  if (format === '1v1') {
    const [p1, p2] = players
    const s1 = p1.score ?? -1
    const s2 = p2.score ?? -1

    // Fetch ELOs for Arena 9 proper calculation
    const [elo1Res, elo2Res] = await Promise.all([
      service.from('arena_progress').select('elo').eq('user_id', p1.user_id).maybeSingle(),
      service.from('arena_progress').select('elo').eq('user_id', p2.user_id).maybeSingle(),
    ])
    const elo1 = (elo1Res.data as any)?.elo ?? 1000
    const elo2 = (elo2Res.data as any)?.elo ?? 1000

    if (p1.score === null && p2.score === null) {
      results = [
        { entryId: p1.id, userId: p1.user_id, result: 'loss', tokenReturn: 0, netTokenChange: -wager },
        { entryId: p2.id, userId: p2.user_id, result: 'loss', tokenReturn: 0, netTokenChange: -wager },
      ]
    } else if (s1 > s2) {
      results = [
        { entryId: p1.id, userId: p1.user_id, result: 'win',  tokenReturn: 2 * wager, netTokenChange: wager, opponentElo: elo2 },
        { entryId: p2.id, userId: p2.user_id, result: 'loss', tokenReturn: 0,         netTokenChange: -wager, opponentElo: elo1 },
      ]
    } else if (s2 > s1) {
      results = [
        { entryId: p1.id, userId: p1.user_id, result: 'loss', tokenReturn: 0,         netTokenChange: -wager, opponentElo: elo2 },
        { entryId: p2.id, userId: p2.user_id, result: 'win',  tokenReturn: 2 * wager, netTokenChange: wager,  opponentElo: elo1 },
      ]
    } else {
      results = [
        { entryId: p1.id, userId: p1.user_id, result: 'refund', tokenReturn: wager, netTokenChange: 0 },
        { entryId: p2.id, userId: p2.user_id, result: 'refund', tokenReturn: wager, netTokenChange: 0 },
      ]
    }

  } else if (format === '2v2') {
    const team1 = players.filter(p => p.team === 1)
    const team2 = players.filter(p => p.team === 2)
    const avg1 = team1.reduce((s, p) => s + (p.score ?? 0), 0) / Math.max(team1.length, 1)
    const avg2 = team2.reduce((s, p) => s + (p.score ?? 0), 0) / Math.max(team2.length, 1)

    if (avg1 === avg2) {
      results = players.map(p => ({ entryId: p.id, userId: p.user_id, result: 'refund', tokenReturn: wager, netTokenChange: 0 }))
    } else {
      const winTeam = avg1 > avg2 ? 1 : 2
      results = players.map(p => ({
        entryId: p.id, userId: p.user_id,
        result: p.team === winTeam ? 'win' : 'loss',
        tokenReturn:    p.team === winTeam ? 2 * wager : 0,
        netTokenChange: p.team === winTeam ? wager : -wager,
      }))
    }

  } else {
    // ffa5 — sort by score, then by submission time (earlier = better on tie)
    const sorted = [...players].sort((a, b) =>
      (b.score ?? -1) - (a.score ?? -1) ||
      ((a.submitted_at ?? '9') < (b.submitted_at ?? '9') ? -1 : 1)
    )
    results = sorted.map((p, i) => {
      if (i === 0) return { entryId: p.id, userId: p.user_id, result: 'win',    tokenReturn: 5 * wager, netTokenChange: 4 * wager }
      if (i === 1) return { entryId: p.id, userId: p.user_id, result: 'refund', tokenReturn: wager,     netTokenChange: 0 }
      return           { entryId: p.id, userId: p.user_id, result: 'loss',   tokenReturn: 0,         netTokenChange: -wager }
    })
  }

  // ── Apply results ────────────────────────────────────────────
  await Promise.all(results.map(async r => {
    // Trophy update (uses DB function)
    const { data: trophyData } = await service.rpc('update_trophies_after_match', {
      p_user_id: r.userId,
      p_result: r.result,
      p_arena_level: arenaLevel,
      p_opponent_elo: r.opponentElo ?? null,
    })
    const trophyChange = trophyData?.trophy_change ?? 0

    // Update match player row
    await service.from('ranked_match_players').update({
      result: r.result,
      trophy_change: trophyChange,
      token_change: r.netTokenChange,
    }).eq('id', r.entryId)

    // Return tokens to winner/refunded
    if (r.tokenReturn > 0) {
      await service.rpc('adjust_tokens', { p_user_id: r.userId, p_amount: r.tokenReturn })
    }

    // Log transaction
    await service.from('token_transactions').insert({
      user_id: r.userId,
      type: r.result === 'win' ? 'ranked_win' : r.result === 'loss' ? 'ranked_loss' : 'ranked_refund',
      amount: r.netTokenChange,
      reference_id: matchId,
      description: `Ranked ${format} — ${r.result}`,
    })
  }))

  // Mark match complete
  await service.from('ranked_matches').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', matchId)
}

export async function POST(req: Request) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { matchId, answer, timeSeconds, cluesUsed } = await req.json() as {
      matchId: string
      answer: string
      timeSeconds: number
      cluesUsed: number
    }

    // Fetch match + challenge
    const { data: match } = await service
      .from('ranked_matches')
      .select('id, status, format, arena_level, challenge_id, challenges(*)')
      .eq('id', matchId)
      .single()

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })

    const challenge = (match.challenges as any)
    if (!challenge) return NextResponse.json({ error: 'No challenge assigned' }, { status: 400 })

    // Verify player is in match and hasn't submitted yet
    const { data: entry } = await service
      .from('ranked_match_players')
      .select('id, submitted_at')
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!entry) return NextResponse.json({ error: 'Not in this match' }, { status: 403 })
    if (entry.submitted_at) return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

    // Judge answer
    const { correct, feedback } = await judgeAnswer(
      answer,
      challenge.location_name,
      challenge.location_country,
      challenge.answer_keywords ?? []
    )

    const score = calcScore(correct, Math.round(timeSeconds), cluesUsed)

    // Record submission
    await service.from('ranked_match_players').update({
      score,
      submitted_at: new Date().toISOString(),
    }).eq('id', entry.id)

    // Check if all players have submitted
    const capacity = MATCH_CAPACITY[match.format]
    const { data: allPlayers } = await service
      .from('ranked_match_players')
      .select('id, user_id, team, score, submitted_at, result, trophy_change, token_change')
      .eq('match_id', matchId)

    const submitted = allPlayers?.filter(p => p.submitted_at !== null) ?? []
    const matchComplete = submitted.length >= (allPlayers?.length ?? capacity)

    if (matchComplete && match.status === 'active') {
      await completeMatch(service, match.id, match.format, match.arena_level, allPlayers ?? [])

      // Fetch final results with profiles
      const { data: finalPlayers } = await service
        .from('ranked_match_players')
        .select('user_id, team, score, result, trophy_change, token_change, profiles(username, equipped_avatar, current_arena:arena_progress(current_arena))')
        .eq('match_id', matchId)

      return NextResponse.json({ correct, feedback, score, matchComplete: true, results: finalPlayers })
    }

    return NextResponse.json({ correct, feedback, score, matchComplete: false })
  } catch (err: any) {
    console.error('[ranked/submit]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
