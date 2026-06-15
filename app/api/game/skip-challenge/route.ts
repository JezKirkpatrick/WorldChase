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

    const [progressRes, profileRes] = await Promise.all([
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle(),
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

    return NextResponse.json({ success: true, newTokenBalance: profileRes.data.tokens - 2 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
