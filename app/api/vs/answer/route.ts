import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

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

  const { data: match } = await admin.from('vs_matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Duel not found' }, { status: 404 })
  if (match.status !== 'active') return NextResponse.json({ error: 'Duel not active' }, { status: 400 })

  const isChallenger = match.challenger_id === user.id
  const isOpponent = match.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  const { data: challenge } = await admin
    .from('challenges')
    .select('answer_keywords, location_name')
    .eq('id', match.challenge_id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const correct = keywordMatch(guess.trim(), challenge.answer_keywords ?? [])
  if (!correct) {
    return NextResponse.json({ correct: false, message: 'Wrong location — keep hunting!' })
  }

  // Race-condition safe: first to submit correct answer atomically claims the win
  const now = new Date().toISOString()
  const solvedField = isChallenger ? 'challenger_solved_at' : 'opponent_solved_at'

  const { data: claimed } = await admin
    .from('vs_matches')
    .update({ status: 'completed', winner_id: user.id, [solvedField]: now })
    .eq('id', matchId)
    .eq('status', 'active')
    .is('winner_id', null)
    .select()
    .maybeSingle()

  if (!claimed) {
    // Another request beat this one — opponent won
    return NextResponse.json({
      correct: true,
      won: false,
      message: 'Correct — but opponent was a fraction faster! 💀',
    })
  }

  // This user is the winner — award tokens + Hall of Fame points
  const totalPot     = match.wager * 2
  const HOF_POINTS   = 100
  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: totalPot }),
    admin.from('token_transactions').insert({
      user_id: user.id,
      type: 'vs_win',
      amount: totalPot,
      description: `VS Duel winner — +${totalPot} tokens`,
    }),
    admin.rpc('increment_vs_stats', { p_user_id: user.id, p_score: HOF_POINTS }),
  ])

  const { data: updatedProfile } = await admin
    .from('profiles').select('tokens').eq('id', user.id).single()

  return NextResponse.json({
    correct: true,
    won: true,
    message: `⚡ YOU WIN! +${totalPot} tokens`,
    newTokenBalance: updatedProfile?.tokens ?? null,
  })
}
