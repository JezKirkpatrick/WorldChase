import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Scores use avg per-round values: easy≈750, medium≈1100, hard≈2000, extreme≈3200, pro≈5500
// Difficulty ladder: rounds 1-5 easy, 6-10 medium, 11-15 hard, 16-20 extreme, 21-25 pro
const FAKE_PLAYERS = [
  { id: 'f0000001-f001-4000-a001-000000000001', username: 'MapMaster_X',    country: 'United States',  country_code: 'us', equipped_avatar: '🗺️', completedRounds: 25, baseScore: 62750 },
  { id: 'f0000001-f001-4000-a001-000000000002', username: 'GeoQuest_Pro',   country: 'United Kingdom', country_code: 'gb', equipped_avatar: '🧭', completedRounds: 24, baseScore: 57250 },
  { id: 'f0000001-f001-4000-a001-000000000003', username: 'AtlasHunter',    country: 'Australia',      country_code: 'au', equipped_avatar: '🌏', completedRounds: 23, baseScore: 51750 },
  { id: 'f0000001-f001-4000-a001-000000000004', username: 'TravelRacer88',  country: 'New Zealand',    country_code: 'nz', equipped_avatar: '✈️', completedRounds: 21, baseScore: 40750 },
  { id: 'f0000001-f001-4000-a001-000000000005', username: 'GlobeTrekker',   country: 'Canada',         country_code: 'ca', equipped_avatar: '🌐', completedRounds: 19, baseScore: 32050 },
  { id: 'f0000001-f001-4000-a001-000000000006', username: 'RoamingRex',     country: 'Germany',        country_code: 'de', equipped_avatar: '🏔️', completedRounds: 18, baseScore: 28850 },
  { id: 'f0000001-f001-4000-a001-000000000007', username: 'WanderKnight',   country: 'Singapore',      country_code: 'sg', equipped_avatar: '⚔️', completedRounds: 16, baseScore: 22450 },
  { id: 'f0000001-f001-4000-a001-000000000008', username: 'ExploreMore7',   country: 'Japan',          country_code: 'jp', equipped_avatar: '🔍', completedRounds: 14, baseScore: 17250 },
  { id: 'f0000001-f001-4000-a001-000000000009', username: 'RiddleMaster',   country: 'South Africa',   country_code: 'za', equipped_avatar: '🎯', completedRounds: 12, baseScore: 13250 },
  { id: 'f0000001-f001-4000-a001-000000000010', username: 'QuestSeeker',    country: 'Brazil',         country_code: 'br', equipped_avatar: '🧩', completedRounds: 10, baseScore:  9250 },
  { id: 'f0000001-f001-4000-a001-000000000011', username: 'WorldHunter',    country: 'France',         country_code: 'fr', equipped_avatar: '🌍', completedRounds:  8, baseScore:  7050 },
  { id: 'f0000001-f001-4000-a001-000000000012', username: 'GeoRookie',      country: 'India',          country_code: 'in', equipped_avatar: '🗿', completedRounds:  6, baseScore:  4850 },
  { id: 'f0000001-f001-4000-a001-000000000013', username: 'PlanetChaser',   country: 'Mexico',         country_code: 'mx', equipped_avatar: '🪐', completedRounds:  4, baseScore:  3000 },
  { id: 'f0000001-f001-4000-a001-000000000014', username: 'RoamingRobin',   country: 'South Korea',    country_code: 'kr', equipped_avatar: '🐦', completedRounds:  2, baseScore:  1500 },
  { id: 'f0000001-f001-4000-a001-000000000015', username: 'WorldWatcher',   country: 'Italy',          country_code: 'it', equipped_avatar: '👁️', completedRounds:  1, baseScore:   750 },
]

function jitter(base: number): number {
  return Math.round(base * (0.88 + Math.random() * 0.24))
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const isValid = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.ADMIN_SECRET}`
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('monthly_events')
    .select('id')
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!event) return NextResponse.json({ success: true, message: 'No active event' })

  // Ensure fake profiles exist (no-op if already created)
  await supabase.from('profiles').upsert(
    FAKE_PLAYERS.map(p => ({
      id: p.id,
      username: p.username,
      display_name: p.username,
      equipped_avatar: p.equipped_avatar,
      equipped_border: 'none',
      country: p.country,
      country_code: p.country_code,
      is_fake: true,
      tokens: 0,
      total_score_alltime: 0,
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Check who already has a leaderboard entry for this event
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('user_id')
    .eq('event_id', event.id)
    .in('user_id', FAKE_PLAYERS.map(p => p.id))

  const existingIds = new Set(existing?.map(r => r.user_id) ?? [])
  const toSeed = FAKE_PLAYERS.filter(p => !existingIds.has(p.id))

  if (toSeed.length === 0) {
    return NextResponse.json({ success: true, message: 'Already seeded for this event' })
  }

  const rows = toSeed.map(p => ({
    user_id: p.id,
    event_id: event.id,
    total_score: jitter(p.baseScore),
    challenges_completed: p.completedRounds,
    current_round: Math.min(p.completedRounds + 1, 25),
  }))

  const { error } = await supabase.from('leaderboard').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, seeded: toSeed.length, event: event.id })
}
