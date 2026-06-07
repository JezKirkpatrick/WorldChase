import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const RESTART_COST = 5

export async function POST(req: NextRequest) {
  const authClient = createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { challengeId } = await req.json()

    const [progressRes, profileRes] = await Promise.all([
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', user.id).single(),
      supabase.from('profiles').select('tokens').eq('id', user.id).single(),
    ])

    if (!progressRes.data) return NextResponse.json({ error: 'Progress not found' }, { status: 404 })
    if (progressRes.data.status !== 'skipped') return NextResponse.json({ error: 'Challenge is not skipped' }, { status: 400 })
    if (!profileRes.data || profileRes.data.tokens < RESTART_COST) {
      return NextResponse.json({ error: `Not enough tokens (need ${RESTART_COST})` }, { status: 400 })
    }

    await Promise.all([
      // Reset the progress row to a fresh active state
      supabase.from('player_progress').update({
        status: 'active',
        attempts: 0,
        clues_revealed: 0,
        score_earned: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
      }).eq('id', progressRes.data.id),
      // Delete previous guesses so they start clean
      supabase.from('guesses').delete().eq('challenge_id', challengeId).eq('user_id', user.id),
      // Charge tokens
      supabase.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -RESTART_COST }),
      supabase.from('token_transactions').insert({
        user_id: user.id,
        type: 'spent_restart',
        amount: -RESTART_COST,
        challenge_id: challengeId,
        description: 'Restarted skipped round',
      }),
    ])

    return NextResponse.json({ success: true, newTokenBalance: profileRes.data.tokens - RESTART_COST })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
