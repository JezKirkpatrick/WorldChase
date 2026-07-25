import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getArenaChallengeDifficulty, DIFFICULTY_CONFIG, MATCH_CAPACITY } from '@/lib/arenas'

export const dynamic = 'force-dynamic'

function keywordMatch(guess: string, keywords: string[]): boolean {
  const g = guess.toLowerCase().trim()
  const gWords = g.split(/[\s,]+/).filter(Boolean)
  return keywords.some(k => {
    const kw = k.toLowerCase().trim()
    if (g === kw) return true
    const kwWords = kw.split(/[\s,]+/).filter(Boolean)
    return kwWords.every(w => gWords.includes(w))
  })
}

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, guess } = await req.json()
  if (!matchId || !guess?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin
    .from('ranked_matches')
    .select('id, status, arena_level, challenge_id, started_at, format')
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })

  // Verify user is a player
  const { data: playerRow } = await admin
    .from('ranked_match_players')
    .select('id, submitted_at, score')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!playerRow) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  if (playerRow.submitted_at) return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

  // Enforce time limit
  const diffKey = getArenaChallengeDifficulty(match.arena_level as number)
  const timeLimit = DIFFICULTY_CONFIG[diffKey].timeLimit
  const elapsedMs = match.started_at ? Date.now() - new Date(match.started_at).getTime() : 0
  const elapsedSecs = Math.floor(elapsedMs / 1000)

  if (elapsedSecs > timeLimit) {
    return NextResponse.json({ error: 'Time limit exceeded' }, { status: 400 })
  }

  // Check answer
  const { data: challenge } = await admin
    .from('challenges')
    .select('answer_keywords, location_name')
    .eq('id', match.challenge_id)
    .maybeSingle()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const correct = keywordMatch(guess.trim(), challenge.answer_keywords ?? [])
  if (!correct) {
    return NextResponse.json({ correct: false, message: 'Wrong location — keep hunting!' })
  }

  // Score = remaining time (higher = faster)
  const score = Math.max(0, timeLimit - elapsedSecs)
  const now = new Date().toISOString()

  await admin
    .from('ranked_match_players')
    .update({ score, submitted_at: now })
    .eq('id', playerRow.id)

  // Check if all players have submitted
  const capacity = MATCH_CAPACITY[match.format as string]
  const { count: submittedCount } = await admin
    .from('ranked_match_players')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .not('submitted_at', 'is', null)

  const allSubmitted = (submittedCount ?? 0) >= capacity

  return NextResponse.json({
    correct: true,
    score,
    message: `Correct! ${score} points`,
    allSubmitted,
  })
}
