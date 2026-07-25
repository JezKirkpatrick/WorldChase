import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin
    .from('ranked_matches')
    .select('id, status, challenge_id, arena_level')
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'completed') return NextResponse.json({ error: 'Match not completed' }, { status: 400 })

  // Verify user was a player
  const { data: playerRow } = await admin
    .from('ranked_match_players')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!playerRow) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  const { data: challenge } = await admin
    .from('challenges')
    .select('location_name, location_country, location_lat, location_lng, fun_fact, riddle_text')
    .eq('id', match.challenge_id)
    .maybeSingle()

  return NextResponse.json({ challenge })
}
