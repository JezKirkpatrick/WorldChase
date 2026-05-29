import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await req.json()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin.from('vs_matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Duel not found' }, { status: 404 })
  if (match.challenger_id !== user.id) return NextResponse.json({ error: 'Only the challenger can cancel' }, { status: 403 })
  if (match.status !== 'pending') return NextResponse.json({ error: 'Can only cancel pending duels' }, { status: 400 })

  // Mark cancelled and refund
  await Promise.all([
    admin.from('vs_matches').update({ status: 'cancelled' }).eq('id', matchId),
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: match.wager }),
    admin.from('token_transactions').insert({
      user_id: user.id,
      type: 'vs_refund',
      amount: match.wager,
      description: 'VS Duel cancelled — wager refunded',
    }),
  ])

  return NextResponse.json({ success: true })
}
