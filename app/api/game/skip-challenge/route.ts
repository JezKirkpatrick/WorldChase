import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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

    const [progressRes, profileRes, challengeRes] = await Promise.all([
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle(),
      supabase.from('challenges').select('event_id, round_number, difficulty').eq('id', challengeId).single(),
    ])

    if (!progressRes.data || !profileRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (profileRes.data.tokens < 2) return NextResponse.json({ error: 'Insufficient tokens' }, { status: 400 })

    await Promise.all([
      supabase.from('player_progress').update({ status: 'skipped', completed_at: new Date().toISOString() }).eq('id', progressRes.data.id),
      supabase.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -2 }),
      supabase.from('token_transactions').insert({
        user_id: user.id, type: 'spent_skip', amount: -2, challenge_id: challengeId,
        description: 'Skipped round',
      }),
    ])

    // Find the next challenge — same event + difficulty, next round number
    let nextChallengeId: string | null = null
    if (challengeRes.data) {
      const { event_id, round_number, difficulty } = challengeRes.data
      const { data: next } = await supabase
        .from('challenges')
        .select('id')
        .eq('event_id', event_id)
        .eq('difficulty', difficulty)
        .eq('round_number', round_number + 1)
        .maybeSingle()
      nextChallengeId = next?.id ?? null
    }

    return NextResponse.json({ success: true, newTokenBalance: profileRes.data.tokens - 2, nextChallengeId })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
