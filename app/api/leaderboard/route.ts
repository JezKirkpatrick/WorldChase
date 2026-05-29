import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)
    const offset  = parseInt(searchParams.get('offset') ?? '0')

    if (!eventId) return NextResponse.json({ entries: [] })

    const supabase = createServiceClient()

    // DB-side join, sort, and pagination — avoids full-table scan + JS sort at scale
    const { data: lbEntries, error } = await supabase
      .from('leaderboard')
      .select('user_id, total_score, challenges_completed, previous_rank, profiles(id, username, display_name, equipped_avatar, equipped_border, equipped_badge, equipped_title, country, country_code)')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const entries = (lbEntries ?? []).map((e, i) => ({
      user_id:              e.user_id,
      profiles:             e.profiles,
      total_score:          e.total_score          ?? 0,
      challenges_completed: e.challenges_completed ?? 0,
      previous_rank:        e.previous_rank        ?? null,
      rank:                 offset + i + 1,
    }))

    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
