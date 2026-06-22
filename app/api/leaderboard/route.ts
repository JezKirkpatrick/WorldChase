import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function pgRest(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${path}`)
  return res.json()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const userId  = searchParams.get('userId')
    const mode    = searchParams.get('mode')
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset  = parseInt(searchParams.get('offset') ?? '0')

    // ── ALL-TIME aggregate mode ───────────────────────────────────────────
    // Sums scores across ALL events per user — no eventId needed
    if (mode === 'alltime') {
      const [allLbRows, profiles] = await Promise.all([
        pgRest('leaderboard?select=user_id,total_score,challenges_completed&limit=100000'),
        pgRest('profiles?select=id,username,display_name,equipped_avatar,equipped_border,equipped_badge,equipped_title,country_code&limit=10000'),
      ])

      const profileMap: Record<string, any> = {}
      for (const p of (profiles as any[]) ?? []) profileMap[p.id] = p

      // Aggregate per user across all events
      const userTotals: Record<string, { total_score: number; challenges_completed: number }> = {}
      for (const row of (allLbRows as any[]) ?? []) {
        if (!userTotals[row.user_id]) userTotals[row.user_id] = { total_score: 0, challenges_completed: 0 }
        userTotals[row.user_id].total_score         += Number(row.total_score) || 0
        userTotals[row.user_id].challenges_completed += Number(row.challenges_completed) || 0
      }

      // Build merged list — only users who have played at least once
      const merged = Object.entries(userTotals).map(([uid, stats]) => ({
        user_id:              uid,
        profiles:             profileMap[uid] ?? null,
        total_score:          stats.total_score,
        challenges_completed: stats.challenges_completed,
        previous_rank:        null,
      }))

      merged.sort((a, b) => {
        const diff = b.total_score - a.total_score
        if (diff !== 0) return diff
        const nameA = a.profiles?.display_name || a.profiles?.username || ''
        const nameB = b.profiles?.display_name || b.profiles?.username || ''
        return nameA.localeCompare(nameB)
      })

      const ranked  = merged.map((e, i) => ({ ...e, rank: i + 1 }))
      const total   = ranked.length

      return NextResponse.json({ entries: ranked, total }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' }
      })
    }

    // ── Event-scoped modes ────────────────────────────────────────────────
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

    const [lbRows, profiles] = await Promise.all([
      pgRest(`leaderboard?select=user_id,total_score,challenges_completed,previous_rank&event_id=eq.${eventId}&limit=10000`),
      pgRest('profiles?select=id,username,display_name,equipped_avatar,equipped_border,equipped_badge,equipped_title,country_code&limit=10000'),
    ])

    const profileMap: Record<string, any> = {}
    for (const p of (profiles as any[]) ?? []) profileMap[p.id] = p

    const lbMap: Record<string, any> = {}
    for (const row of (lbRows as any[]) ?? []) lbMap[row.user_id] = row

    // Only include users who have an actual leaderboard entry for this event
    const allUserIds = new Set<string>()
    for (const row of (lbRows as any[]) ?? []) allUserIds.add(row.user_id)

    const merged = Array.from(allUserIds).map(uid => ({
      user_id:              uid,
      profiles:             profileMap[uid] ?? null,
      total_score:          Number(lbMap[uid]?.total_score)          || 0,
      challenges_completed: Number(lbMap[uid]?.challenges_completed) || 0,
      previous_rank:        typeof lbMap[uid]?.previous_rank === 'number' ? lbMap[uid].previous_rank : null,
    }))

    merged.sort((a, b) => {
      const diff = b.total_score - a.total_score
      if (diff !== 0) return diff
      const nameA = a.profiles?.display_name || a.profiles?.username || ''
      const nameB = b.profiles?.display_name || b.profiles?.username || ''
      return nameA.localeCompare(nameB)
    })

    const ranked = merged.map((e, i) => ({ ...e, rank: i + 1 }))
    const total  = ranked.length

    // ── SMART MODE ────────────────────────────────────────────────────────
    if (mode === 'smart') {
      const top10 = ranked.slice(0, 10)

      let myRank: number | null = null
      let neighbourhood: any[] | null = null

      if (userId) {
        const myIndex = ranked.findIndex(e => e.user_id === userId)
        if (myIndex !== -1) {
          myRank = myIndex + 1
          if (myRank > 10) {
            const lo = Math.max(10, myIndex - 3)
            const hi = Math.min(ranked.length - 1, myIndex + 3)
            neighbourhood = ranked.slice(lo, hi + 1)
          }
        }
      }

      return NextResponse.json({ top: top10, neighbourhood, myRank, total }, {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' }
      })
    }

    // ── PAGINATED MODE ────────────────────────────────────────────────────
    const entries = ranked.slice(offset, offset + limit)
    return NextResponse.json({ entries, total }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5' }
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
