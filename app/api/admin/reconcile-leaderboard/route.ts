import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Recomputes every real player's leaderboard row from player_progress (the actual
// source of truth for completed hunt rounds) and repairs any drift. Exists because
// side features (Geo Quiz, Daily Flag Pick) used to write their own score into the
// same leaderboard row and silently corrupt the "X/25" round-progress counter —
// this is the safety net in case any future code path does the same thing again.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: mismatches } = await service.rpc('find_leaderboard_mismatches')

  if (!mismatches || mismatches.length === 0) {
    return NextResponse.json({ fixed: 0, mismatches: [] })
  }

  await service.rpc('repair_leaderboard_mismatches')

  return NextResponse.json({
    fixed: mismatches.length,
    mismatches: mismatches.map((m: any) => ({
      username: m.username,
      event_id: m.event_id,
      was: { completed: m.lb_completed, score: m.lb_score },
      now: { completed: m.real_completed, score: m.real_score },
    })),
  })
}
