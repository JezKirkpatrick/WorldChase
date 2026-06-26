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
  if (match.challenger_id === user.id) return NextResponse.json({ error: 'Cannot join your own duel' }, { status: 400 })
  if (match.status !== 'pending') return NextResponse.json({ error: 'Duel is no longer open' }, { status: 400 })
  if (new Date(match.expires_at) < new Date()) return NextResponse.json({ error: 'Duel has expired' }, { status: 400 })

  const { data: profile } = await admin.from('profiles').select('tokens').eq('id', user.id).maybeSingle()
  if (!profile || profile.tokens < match.wager) {
    return NextResponse.json({ error: `Not enough tokens (need ${match.wager})` }, { status: 400 })
  }

  // Atomically claim the match — UPDATE only succeeds if status is still 'pending',
  // preventing two players from joining the same duel simultaneously
  const now = new Date().toISOString()
  const { data: claimed } = await admin.from('vs_matches').update({
    opponent_id: user.id,
    status: 'active',
    started_at: now,
  }).eq('id', matchId).eq('status', 'pending').select('id')

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Duel is no longer available' }, { status: 409 })
  }

  // Match claimed — deduct opponent's wager
  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -match.wager }),
    admin.from('token_transactions').insert({
      user_id: user.id,
      type: 'vs_wager',
      amount: -match.wager,
      description: `VS Duel — wager staked (${match.wager} tokens)`,
    }),
  ])

  return NextResponse.json({ success: true })
}
