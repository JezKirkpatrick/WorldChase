import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const supabase = createServiceClient()

    let query = supabase
      .from('leaderboard')
      .select(`*, profiles(username, display_name, equipped_avatar, equipped_border, equipped_badge, equipped_title, country, country_code)`)
      .order('total_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventId) query = query.eq('event_id', eventId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ entries: data ?? [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
