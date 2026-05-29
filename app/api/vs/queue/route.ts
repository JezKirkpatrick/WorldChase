import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const VALID_WAGERS = [10, 25, 50, 100]

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { wager } = await req.json()
  if (!VALID_WAGERS.includes(wager)) {
    return NextResponse.json({ error: 'Invalid wager amount' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < wager) {
    return NextResponse.json({ error: `Not enough tokens (need ${wager})` }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Look for an open queue match with the same wager (not our own, not expired)
  const { data: existing } = await admin
    .from('vs_matches')
    .select('id')
    .eq('match_type', 'queue')
    .eq('wager', wager)
    .eq('status', 'pending')
    .neq('challenger_id', user.id)
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Atomically claim the match — prevents two players joining simultaneously
    const { data: claimed } = await admin
      .from('vs_matches')
      .update({ opponent_id: user.id, status: 'active', started_at: now })
      .eq('id', existing.id)
      .eq('status', 'pending')
      .select('id')

    if (claimed && claimed.length > 0) {
      // Successfully joined — deduct wager
      await Promise.all([
        admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -wager }),
        admin.from('token_transactions').insert({
          user_id: user.id,
          type: 'vs_wager',
          amount: -wager,
          description: `VS World — wager staked (${wager} tokens)`,
        }),
      ])
      return NextResponse.json({ matchId: existing.id, matched: true })
    }
    // Race: someone else got it — fall through to create our own
  }

  // No open match found — pick a challenge and create a queue slot
  const { data: event } = await admin.from('monthly_events').select('id').eq('status', 'active').maybeSingle()
  if (!event) return NextResponse.json({ error: 'No active event running' }, { status: 400 })

  const { data: challenges } = await admin.from('challenges').select('id').eq('event_id', event.id)
  if (!challenges?.length) return NextResponse.json({ error: 'No challenges available' }, { status: 400 })

  const picked = challenges[Math.floor(Math.random() * challenges.length)]

  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -wager }),
    admin.from('token_transactions').insert({
      user_id: user.id,
      type: 'vs_wager',
      amount: -wager,
      description: `VS World — wager staked (${wager} tokens)`,
    }),
  ])

  const { data: match, error } = await admin
    .from('vs_matches')
    .insert({ challenge_id: picked.id, challenger_id: user.id, wager, match_type: 'queue' })
    .select('id')
    .single()

  if (error || !match) {
    await admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: wager })
    return NextResponse.json({ error: 'Failed to enter queue' }, { status: 500 })
  }

  return NextResponse.json({ matchId: match.id, matched: false })
}
