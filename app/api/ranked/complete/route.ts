import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

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
    .select('id, status')
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Idempotent: if already completed, return current state
  if (match.status === 'completed') {
    const { data: players } = await admin
      .from('ranked_match_players')
      .select('user_id, score, result, trophy_change, token_change')
      .eq('match_id', matchId)
    return NextResponse.json({ success: true, alreadyCompleted: true, players })
  }

  if (match.status !== 'active') {
    return NextResponse.json({ error: 'Match not active' }, { status: 400 })
  }

  // Verify user is a participant
  const { data: playerRow } = await admin
    .from('ranked_match_players')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!playerRow) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  // Zero-out any players who timed out without submitting
  await admin
    .from('ranked_match_players')
    .update({ score: 0, submitted_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .is('submitted_at', null)

  // Call the DB function that handles all scoring, token transfers, and trophy updates
  const { data: result, error } = await admin.rpc('handle_match_completion', { p_match_id: matchId })

  if (error) {
    return NextResponse.json({ error: 'Completion failed', detail: error.message }, { status: 500 })
  }

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Fetch final player results for the response
  const { data: players } = await admin
    .from('ranked_match_players')
    .select('user_id, score, result, trophy_change, token_change')
    .eq('match_id', matchId)

  return NextResponse.json({ success: true, players })
}
