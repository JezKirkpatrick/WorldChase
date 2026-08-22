import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  try {
    const { countryCode, countryName, timeTaken, eventId } = await req.json()

    // Idempotency: check if already completed today
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const { data: existing } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_flag')
      .gte('created_at', todayStart.toISOString())
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already completed today' }, { status: 400 })

    // Score: max 300, time-based
    const MAX_SCORE = 300
    const score = Math.max(50, MAX_SCORE - Math.floor((timeTaken ?? 0) / 5))
    const tokensEarned = 2

    // Get current token balance for response
    const { data: profile } = await supabase
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .maybeSingle()

    const ops: any[] = [
      supabase.rpc('adjust_tokens', { p_user_id: user.id, p_amount: tokensEarned }),
      supabase.from('token_transactions').insert({
        user_id: user.id,
        type: 'daily_flag',
        amount: tokensEarned,
        description: `Daily flag puzzle: ${countryName}`,
      }),
    ]

    // Add to leaderboard if active event — single shared, atomic RPC for every
    // feature that touches the leaderboard. p_round_completed defaults to false,
    // so this never bumps the "X/25" hunt round-progress counter.
    if (eventId) {
      ops.push(
        supabase.rpc('credit_leaderboard', {
          p_user_id: user.id,
          p_event_id: eventId,
          p_score_delta: score,
        })
      )
    }

    await Promise.all(ops)

    return NextResponse.json({
      score,
      tokensEarned,
      newTokenBalance: (profile?.tokens ?? 0) + tokensEarned,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
