import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ARENA_WAGERS } from '@/lib/arenas'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await req.json()
  if (!matchId) return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin
    .from('ranked_matches')
    .select('id, status, invited_user_id, arena_level')
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'waiting') return NextResponse.json({ error: 'Match no longer available' }, { status: 400 })
  if (match.invited_user_id !== user.id) return NextResponse.json({ error: 'This invite is not for you' }, { status: 403 })

  const wager = ARENA_WAGERS[match.arena_level as number]

  // Validate invitee has enough tokens
  const { data: profile } = await admin
    .from('profiles').select('tokens').eq('id', user.id).maybeSingle()
  if (!profile || profile.tokens < wager) {
    return NextResponse.json({ error: `Need ${wager} tokens to accept this challenge` }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Add invitee to match players
  const { error: playerErr } = await admin
    .from('ranked_match_players')
    .insert({ match_id: matchId, user_id: user.id })

  if (playerErr) {
    return NextResponse.json({ error: 'Failed to join match' }, { status: 500 })
  }

  // Activate match
  const { error: updateErr } = await admin
    .from('ranked_matches')
    .update({ status: 'active', started_at: now })
    .eq('id', matchId)
    .eq('status', 'waiting')

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to start match' }, { status: 500 })
  }

  return NextResponse.json({ matchId, started: true })
}
