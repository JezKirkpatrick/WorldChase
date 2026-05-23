import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { challengeId, userId, eventId } = await req.json()

    const existing = await supabase
      .from('player_progress')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing.data) return NextResponse.json({ success: true })

    await supabase.from('player_progress').insert({
      user_id: userId, event_id: eventId, challenge_id: challengeId,
      status: 'active', started_at: new Date().toISOString(),
    })

    await supabase.from('leaderboard').upsert({
      user_id: userId, event_id: eventId, total_score: 0,
    }, { onConflict: 'user_id,event_id', ignoreDuplicates: true })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
