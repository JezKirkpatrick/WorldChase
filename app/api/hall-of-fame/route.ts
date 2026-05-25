import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const countryCode = searchParams.get('country') // null = global
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

    const supabase = createServiceClient()

    // Pull every leaderboard row with profile data (aggregated per-event)
    const { data, error } = await supabase
      .from('leaderboard')
      .select(`user_id, total_score, challenges_completed,
               profiles(username, display_name, equipped_avatar, equipped_border,
                        equipped_title, equipped_badge, country, country_code)`)

    if (error) throw error

    // Build country list from all rows (before country filter)
    const countryMap: Record<string, string> = {}
    for (const row of data ?? []) {
      const p = (row as any).profiles
      if (p?.country_code && p?.country) countryMap[p.country_code] = p.country
    }
    const countries = Object.entries(countryMap)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Optionally filter by country
    const rows = countryCode
      ? (data ?? []).filter((r: any) => r.profiles?.country_code === countryCode)
      : (data ?? [])

    // Aggregate across all events per user
    const byUser: Record<string, {
      user_id: string
      all_time_score: number
      rounds_won: number
      events_played: number
      profiles: any
    }> = {}

    for (const row of rows) {
      const uid = (row as any).user_id
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id:       uid,
          all_time_score: 0,
          rounds_won:    0,
          events_played: 0,
          profiles:      (row as any).profiles,
        }
      }
      byUser[uid].all_time_score += (row as any).total_score        ?? 0
      byUser[uid].rounds_won     += (row as any).challenges_completed ?? 0
      byUser[uid].events_played  += 1
    }

    // Sort, rank, trim
    const entries = Object.values(byUser)
      .filter(e => e.all_time_score > 0)
      .sort((a, b) => b.all_time_score - a.all_time_score)
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    return NextResponse.json({ entries, countries }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
