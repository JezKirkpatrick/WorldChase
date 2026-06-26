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
    const { cosmeticId } = await req.json()
    if (!cosmeticId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const [cosmeticRes, profileRes, ownedRes] = await Promise.all([
      supabase.from('cosmetics').select('*').eq('id', cosmeticId).maybeSingle(),
      supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle(),
      supabase.from('user_cosmetics').select('id').eq('user_id', user.id).eq('cosmetic_id', cosmeticId).maybeSingle(),
    ])

    if (cosmeticRes.error || !cosmeticRes.data) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (ownedRes.data) return NextResponse.json({ error: 'Already owned' }, { status: 400 })

    const cosmetic = cosmeticRes.data
    const tokens   = profileRes.data?.tokens ?? 0
    if (tokens < cosmetic.token_cost) return NextResponse.json({ error: 'Not enough tokens' }, { status: 400 })

    await Promise.all([
      supabase.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -cosmetic.token_cost }),
      supabase.from('user_cosmetics').insert({ user_id: user.id, cosmetic_id: cosmeticId }),
      supabase.from('token_transactions').insert({
        user_id: user.id, type: 'spent_shop', amount: -cosmetic.token_cost,
        description: `Purchased cosmetic: ${cosmetic.name}`,
      }),
    ])

    const { data: profileData } = await supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle()
    return NextResponse.json({ newTokenBalance: profileData?.tokens ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
