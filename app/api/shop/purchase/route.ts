import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { userId, cosmeticId } = await req.json()
    if (!userId || !cosmeticId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const [cosmeticRes, profileRes, ownedRes] = await Promise.all([
      supabase.from('cosmetics').select('*').eq('id', cosmeticId).single(),
      supabase.from('profiles').select('tokens').eq('id', userId).single(),
      supabase.from('user_cosmetics').select('id').eq('user_id', userId).eq('cosmetic_id', cosmeticId).maybeSingle(),
    ])

    if (cosmeticRes.error || !cosmeticRes.data) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (ownedRes.data) return NextResponse.json({ error: 'Already owned' }, { status: 400 })

    const cosmetic = cosmeticRes.data
    const tokens = profileRes.data?.tokens ?? 0
    if (tokens < cosmetic.token_cost) return NextResponse.json({ error: 'Not enough tokens' }, { status: 400 })

    const newBalance = tokens - cosmetic.token_cost

    await Promise.all([
      supabase.from('profiles').update({ tokens: newBalance }).eq('id', userId),
      supabase.from('user_cosmetics').insert({ user_id: userId, cosmetic_id: cosmeticId }),
      supabase.from('token_transactions').insert({
        user_id: userId, type: 'spent_clue', amount: -cosmetic.token_cost,
        description: `Purchased cosmetic: ${cosmetic.name}`,
      }),
    ])

    return NextResponse.json({ newTokenBalance: newBalance })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
