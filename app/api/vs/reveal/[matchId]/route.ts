import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: match } = await admin.from('vs_matches').select('*').eq('id', params.matchId).maybeSingle()
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only participants can see the answer reveal
  if (match.challenger_id !== user.id && match.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (match.status !== 'completed') {
    return NextResponse.json({ error: 'Match not yet completed' }, { status: 400 })
  }

  const { data: challenge } = await admin
    .from('challenges')
    .select('location_name, location_country, fun_fact')
    .eq('id', match.challenge_id)
    .maybeSingle()

  return NextResponse.json({
    locationName: challenge?.location_name,
    locationCountry: challenge?.location_country,
    funFact: challenge?.fun_fact,
  })
}
