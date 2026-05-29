import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const countryCode = searchParams.get('country')
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

    const supabase = createServiceClient()

    // Fetch monthly event scores + VS duel stats in parallel
    const [lbRes, vsRes] = await Promise.all([
      supabase
        .from('leaderboard')
        .select(`user_id, total_score, challenges_completed,
                 profiles(username, display_name, equipped_avatar, equipped_border,
                          equipped_title, equipped_badge, country, country_code)`),
      supabase
        .from('profiles')
        .select(`id, vs_score, vs_duels_won, username, display_name,
                 equipped_avatar, equipped_border, equipped_title, equipped_badge,
                 country, country_code`)
        .gt('vs_score', 0),
    ])

    if (lbRes.error) throw lbRes.error

    const byUser: Record<string, {
      user_id: string
      all_time_score: number
      rounds_won: number
      events_played: number
      profiles: any
    }> = {}

    // Aggregate monthly event scores
    for (const row of lbRes.data ?? []) {
      const uid = (row as any).user_id
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id:        uid,
          all_time_score: 0,
          rounds_won:     0,
          events_played:  0,
          profiles:       (row as any).profiles,
        }
      }
      byUser[uid].all_time_score += (row as any).total_score          ?? 0
      byUser[uid].rounds_won     += (row as any).challenges_completed ?? 0
      byUser[uid].events_played  += 1
    }

    // Merge VS duel stats — adds to existing entry or creates VS-only entry
    for (const vp of vsRes.data ?? []) {
      const vsScore    = vp.vs_score     ?? 0
      const vsDuelsWon = vp.vs_duels_won ?? 0
      if (byUser[vp.id]) {
        byUser[vp.id].all_time_score += vsScore
        byUser[vp.id].rounds_won     += vsDuelsWon
      } else {
        byUser[vp.id] = {
          user_id:        vp.id,
          all_time_score: vsScore,
          rounds_won:     vsDuelsWon,
          events_played:  0,
          profiles: {
            username:       vp.username,
            display_name:   vp.display_name,
            equipped_avatar: vp.equipped_avatar,
            equipped_border: vp.equipped_border,
            equipped_title:  vp.equipped_title,
            equipped_badge:  vp.equipped_badge,
            country:         vp.country,
            country_code:    vp.country_code,
          },
        }
      }
    }

    // Build country list from the full merged set
    const countryMap: Record<string, string> = {}
    for (const entry of Object.values(byUser)) {
      const p = entry.profiles
      if (p?.country_code && p?.country) countryMap[p.country_code] = p.country
    }
    const countries = Object.entries(countryMap)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Apply country filter, sort, rank, trim
    const pool = countryCode
      ? Object.values(byUser).filter(e => e.profiles?.country_code === countryCode)
      : Object.values(byUser)

    const entries = pool
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
