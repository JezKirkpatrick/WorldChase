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

  // Check token balance
  const { data: profile } = await admin.from('profiles').select('tokens').eq('id', user.id).single()
  if (!profile || profile.tokens < wager) {
    return NextResponse.json({ error: `Not enough tokens (need ${wager}, have ${profile?.tokens ?? 0})` }, { status: 400 })
  }

  // Pick a random challenge from the active event
  const { data: event } = await admin.from('monthly_events').select('id').eq('status', 'active').maybeSingle()
  if (!event) return NextResponse.json({ error: 'No active event running' }, { status: 400 })

  const { data: challenges } = await admin.from('challenges').select('id').eq('event_id', event.id)
  if (!challenges?.length) return NextResponse.json({ error: 'No challenges available' }, { status: 400 })

  const picked = challenges[Math.floor(Math.random() * challenges.length)]

  // Deduct wager tokens from challenger
  await Promise.all([
    admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -wager }),
    admin.from('token_transactions').insert({
      user_id: user.id,
      type: 'vs_wager',
      amount: -wager,
      description: `VS Duel — wager staked (${wager} tokens)`,
    }),
  ])

  // Create the match
  const { data: match, error } = await admin
    .from('vs_matches')
    .insert({ challenge_id: picked.id, challenger_id: user.id, wager })
    .select('id')
    .single()

  if (error || !match) {
    // Refund on failure
    await admin.rpc('adjust_tokens', { p_user_id: user.id, p_amount: wager })
    return NextResponse.json({ error: 'Failed to create duel' }, { status: 500 })
  }

  return NextResponse.json({ matchId: match.id })
}
