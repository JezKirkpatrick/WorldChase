import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Scores use avg per-round values: easy≈750, medium≈1100, hard≈2000, extreme≈3200, pro≈5500
// Difficulty ladder: rounds 1-5 easy, 6-10 medium, 11-15 hard, 16-20 extreme, 21-25 pro
const FAKE_PLAYERS = [
  { id: 'f0000001-f001-4000-a001-000000000001', username: 'MapMaster_X',    country: 'United States',  country_code: 'us', equipped_avatar: '🗺️', completedRounds: 25, baseScore: 62750 },
  { id: 'f0000001-f001-4000-a001-000000000002', username: 'GeoQuest_Pro',   country: 'United Kingdom', country_code: 'gb', equipped_avatar: '🧭', completedRounds: 25, baseScore: 61200 },
  { id: 'f0000001-f001-4000-a001-000000000003', username: 'AtlasHunter',    country: 'Australia',      country_code: 'au', equipped_avatar: '🌏', completedRounds: 25, baseScore: 59800 },
  { id: 'f0000001-f001-4000-a001-000000000004', username: 'ChaseMaster',    country: 'Sweden',         country_code: 'se', equipped_avatar: '🏹', completedRounds: 25, baseScore: 58100 },
  { id: 'f0000001-f001-4000-a001-000000000005', username: 'TerraMaster',    country: 'Japan',          country_code: 'jp', equipped_avatar: '⛩️', completedRounds: 24, baseScore: 57250 },
  { id: 'f0000001-f001-4000-a001-000000000006', username: 'NomadHero',      country: 'Norway',         country_code: 'no', equipped_avatar: '🧭', completedRounds: 24, baseScore: 56000 },
  { id: 'f0000001-f001-4000-a001-000000000007', username: 'GlobeTracer',    country: 'South Korea',    country_code: 'kr', equipped_avatar: '🔭', completedRounds: 23, baseScore: 51750 },
  { id: 'f0000001-f001-4000-a001-000000000008', username: 'HuntPro',        country: 'Chile',          country_code: 'cl', equipped_avatar: '🏔️', completedRounds: 23, baseScore: 50500 },
  { id: 'f0000001-f001-4000-a001-000000000009', username: 'TravelRacer88',  country: 'New Zealand',    country_code: 'nz', equipped_avatar: '✈️', completedRounds: 22, baseScore: 46250 },
  { id: 'f0000001-f001-4000-a001-000000000010', username: 'WayfinderX',     country: 'Netherlands',    country_code: 'nl', equipped_avatar: '🌤️', completedRounds: 22, baseScore: 45100 },
  { id: 'f0000001-f001-4000-a001-000000000011', username: 'OceanHunter',    country: 'Spain',          country_code: 'es', equipped_avatar: '🌊', completedRounds: 21, baseScore: 40750 },
  { id: 'f0000001-f001-4000-a001-000000000012', username: 'GlobeTrekker',   country: 'Canada',         country_code: 'ca', equipped_avatar: '🌐', completedRounds: 21, baseScore: 39600 },
  { id: 'f0000001-f001-4000-a001-000000000013', username: 'MapNinja',       country: 'Brazil',         country_code: 'br', equipped_avatar: '⚡', completedRounds: 20, baseScore: 35250 },
  { id: 'f0000001-f001-4000-a001-000000000014', username: 'LandmarkPro',    country: 'Argentina',      country_code: 'ar', equipped_avatar: '🏟️', completedRounds: 20, baseScore: 34200 },
  { id: 'f0000001-f001-4000-a001-000000000015', username: 'RouteRacer',     country: 'Germany',        country_code: 'de', equipped_avatar: '🏎️', completedRounds: 19, baseScore: 32050 },
  { id: 'f0000001-f001-4000-a001-000000000016', username: 'GeoHawk',        country: 'Nigeria',        country_code: 'ng', equipped_avatar: '🦅', completedRounds: 19, baseScore: 31000 },
  { id: 'f0000001-f001-4000-a001-000000000017', username: 'SavannaRex',     country: 'Kenya',          country_code: 'ke', equipped_avatar: '🦁', completedRounds: 18, baseScore: 28850 },
  { id: 'f0000001-f001-4000-a001-000000000018', username: 'TrailBlazer',    country: 'India',          country_code: 'in', equipped_avatar: '🏕️', completedRounds: 18, baseScore: 27800 },
  { id: 'f0000001-f001-4000-a001-000000000019', username: 'HorizonPro',     country: 'Poland',         country_code: 'pl', equipped_avatar: '🌅', completedRounds: 17, baseScore: 25650 },
  { id: 'f0000001-f001-4000-a001-000000000020', username: 'GeoScholar',     country: 'Philippines',    country_code: 'ph', equipped_avatar: '📚', completedRounds: 17, baseScore: 24700 },
  { id: 'f0000001-f001-4000-a001-000000000021', username: 'WanderWarrior',  country: 'Singapore',      country_code: 'sg', equipped_avatar: '⚔️', completedRounds: 16, baseScore: 22450 },
  { id: 'f0000001-f001-4000-a001-000000000022', username: 'MapRanger',      country: 'Czech Republic', country_code: 'cz', equipped_avatar: '🧭', completedRounds: 16, baseScore: 21600 },
  { id: 'f0000001-f001-4000-a001-000000000023', username: 'SkyWatcher',     country: 'Portugal',       country_code: 'pt', equipped_avatar: '🌤️', completedRounds: 15, baseScore: 19250 },
  { id: 'f0000001-f001-4000-a001-000000000024', username: 'TrailFinder',    country: 'Morocco',        country_code: 'ma', equipped_avatar: '🌄', completedRounds: 15, baseScore: 18500 },
  { id: 'f0000001-f001-4000-a001-000000000025', username: 'ExploreXtreme',  country: 'Turkey',         country_code: 'tr', equipped_avatar: '🔍', completedRounds: 14, baseScore: 17250 },
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
