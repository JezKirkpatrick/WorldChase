import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const limit   = parseInt(searchParams.get('limit') ?? '200')
    const offset  = parseInt(searchParams.get('offset') ?? '0')

    const supabase = createServiceClient()

    // Fetch all profiles + leaderboard entries for the event in parallel
    const [profilesRes, lbRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, equipped_avatar, equipped_border, equipped_badge, equipped_title, country, country_code'),
      eventId
        ? supabase.from('leaderboard').select('user_id, total_score, challenges_completed, previous_rank').eq('event_id', eventId)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (profilesRes.error) throw profilesRes.error

    // Build a score map keyed by user_id
    const scoreMap: Record<string, { total_score: number; challenges_completed: number; previous_rank: number | null }> = {}
    for (const row of (lbRes as any).data ?? []) {
      scoreMap[row.user_id] = {
        total_score:         row.total_score          ?? 0,
        challenges_completed: row.challenges_completed ?? 0,
        previous_rank:       row.previous_rank        ?? null,
      }
    }

    // Merge: every profile gets a leaderboard entry (defaulting to 0)
    const merged = (profilesRes.data ?? []).map(p => ({
      user_id:              p.id,
      profiles:             p,
      total_score:          scoreMap[p.id]?.total_score          ?? 0,
      challenges_completed: scoreMap[p.id]?.challenges_completed ?? 0,
      previous_rank:        scoreMap[p.id]?.previous_rank        ?? null,
    }))

    // Sort by score desc, then alphabetically for ties
    merged.sort((a, b) =>
      b.total_score - a.total_score ||
      (a.profiles.display_name || a.profiles.username || '').localeCompare(
        b.profiles.display_name || b.profiles.username || ''
      )
    )

    // Paginate + assign rank
    const entries = merged
      .slice(offset, offset + limit)
      .map((e, i) => ({ ...e, rank: offset + i + 1 }))

    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
