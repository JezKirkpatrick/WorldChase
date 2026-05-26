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

    // Assign rank from position so it's always correct regardless of stored value
    const entries = (data ?? []).map((entry, i) => ({ ...entry, rank: offset + i + 1 }))

    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
