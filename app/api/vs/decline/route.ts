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

  const { data: match } = await admin.from('vs_matches').select('*').eq('id', matchId).maybeSingle()
  if (!match) return NextResponse.json({ error: 'Duel not found' }, { status: 404 })
  if (match.status !== 'pending') return NextResponse.json({ error: 'Not pending' }, { status: 400 })
  if (match.challenger_id === user.id) return NextResponse.json({ error: 'Use cancel instead' }, { status: 400 })

  // For friend invites verify this user is the intended recipient
  if (match.match_type === 'friend_invite' && match.invited_friend_id !== user.id) {
    return NextResponse.json({ error: 'Not your invite' }, { status: 403 })
  }

  const { data: cancelled } = await admin.from('vs_matches')
    .update({ status: 'cancelled' })
    .eq('id', matchId)
    .eq('status', 'pending')
    .select('id')

  if (!cancelled || cancelled.length === 0) {
    return NextResponse.json({ error: 'Already gone' }, { status: 409 })
  }

  // Refund the challenger's wager
  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: match.challenger_id, p_amount: match.wager }),
    admin.from('token_transactions').insert({
      user_id: match.challenger_id,
      type: 'vs_refund',
      amount: match.wager,
      description: 'VS Duel declined — wager refunded',
    }),
  ])

  return NextResponse.json({ success: true })
}
