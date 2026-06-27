import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Scores set at ~50% of max to let real players beat fake ones after a few rounds
// Difficulty ladder: rounds 1-5 easy, 6-10 medium, 11-15 hard, 16-20 extreme, 21-25 pro
const FAKE_PLAYERS = [
  { id: 'f0000001-f001-4000-a001-000000000001', username: 'jake_92',      country: 'United States',  country_code: 'us', equipped_avatar: '🌍', completedRounds: 25, baseScore: 31500 },
  { id: 'f0000001-f001-4000-a001-000000000002', username: 'sarahm',       country: 'United Kingdom', country_code: 'gb', equipped_avatar: '🌎', completedRounds: 25, baseScore: 30500 },
  { id: 'f0000001-f001-4000-a001-000000000003', username: 'tom_b83',      country: 'Australia',      country_code: 'au', equipped_avatar: '🌏', completedRounds: 25, baseScore: 29900 },
  { id: 'f0000001-f001-4000-a001-000000000004', username: 'mikeyg',       country: 'Sweden',         country_code: 'se', equipped_avatar: '⚡', completedRounds: 25, baseScore: 29000 },
  { id: 'f0000001-f001-4000-a001-000000000005', username: 'pete77',       country: 'Japan',          country_code: 'jp', equipped_avatar: '🎯', completedRounds: 24, baseScore: 28500 },
  { id: 'f0000001-f001-4000-a001-000000000006', username: 'dani_k',       country: 'Norway',         country_code: 'no', equipped_avatar: '🏔️', completedRounds: 24, baseScore: 28000 },
  { id: 'f0000001-f001-4000-a001-000000000007', username: 'russ_nz',      country: 'South Korea',    country_code: 'kr', equipped_avatar: '🌊', completedRounds: 23, baseScore: 25800 },
  { id: 'f0000001-f001-4000-a001-000000000008', username: 'chris_cl',     country: 'Chile',          country_code: 'cl', equipped_avatar: '✈️', completedRounds: 23, baseScore: 25200 },
  { id: 'f0000001-f001-4000-a001-000000000009', username: 'benhunt',      country: 'New Zealand',    country_code: 'nz', equipped_avatar: '🗺️', completedRounds: 22, baseScore: 23100 },
  { id: 'f0000001-f001-4000-a001-000000000010', username: 'ellie_j',      country: 'Netherlands',    country_code: 'nl', equipped_avatar: '🌸', completedRounds: 22, baseScore: 22500 },
  { id: 'f0000001-f001-4000-a001-000000000011', username: 'adam_k',       country: 'Spain',          country_code: 'es', equipped_avatar: '🔥', completedRounds: 21, baseScore: 20400 },
  { id: 'f0000001-f001-4000-a001-000000000012', username: 'lucy_r',       country: 'Canada',         country_code: 'ca', equipped_avatar: '⭐', completedRounds: 21, baseScore: 19800 },
  { id: 'f0000001-f001-4000-a001-000000000013', username: 'robw',         country: 'Brazil',         country_code: 'br', equipped_avatar: '🏄', completedRounds: 20, baseScore: 17600 },
  { id: 'f0000001-f001-4000-a001-000000000014', username: 'kez_uk',       country: 'Argentina',      country_code: 'ar', equipped_avatar: '💫', completedRounds: 20, baseScore: 17100 },
  { id: 'f0000001-f001-4000-a001-000000000015', username: 'nath_p',       country: 'Germany',        country_code: 'de', equipped_avatar: '🚀', completedRounds: 19, baseScore: 16000 },
  { id: 'f0000001-f001-4000-a001-000000000016', username: 'stevo88',      country: 'Nigeria',        country_code: 'ng', equipped_avatar: '🦊', completedRounds: 19, baseScore: 15500 },
  { id: 'f0000001-f001-4000-a001-000000000017', username: 'jess_m',       country: 'Kenya',          country_code: 'ke', equipped_avatar: '🌺', completedRounds: 18, baseScore: 14400 },
  { id: 'f0000001-f001-4000-a001-000000000018', username: 'davec',        country: 'India',          country_code: 'in', equipped_avatar: '🎲', completedRounds: 18, baseScore: 13900 },
  { id: 'f0000001-f001-4000-a001-000000000019', username: 'leah_g',       country: 'Poland',         country_code: 'pl', equipped_avatar: '🌙', completedRounds: 17, baseScore: 12800 },
  { id: 'f0000001-f001-4000-a001-000000000020', username: 'mark99',       country: 'Philippines',    country_code: 'ph', equipped_avatar: '🏆', completedRounds: 17, baseScore: 12300 },
  { id: 'f0000001-f001-4000-a001-000000000021', username: 'carl_j',       country: 'Singapore',      country_code: 'sg', equipped_avatar: '🎮', completedRounds: 16, baseScore: 11200 },
  { id: 'f0000001-f001-4000-a001-000000000022', username: 'kat_b',        country: 'Czech Republic', country_code: 'cz', equipped_avatar: '🦋', completedRounds: 16, baseScore: 10800 },
  { id: 'f0000001-f001-4000-a001-000000000023', username: 'dan_h',        country: 'Portugal',       country_code: 'pt', equipped_avatar: '🎯', completedRounds: 15, baseScore:  9600 },
  { id: 'f0000001-f001-4000-a001-000000000024', username: 'emma_r',       country: 'Morocco',        country_code: 'ma', equipped_avatar: '🌴', completedRounds: 15, baseScore:  9200 },
  { id: 'f0000001-f001-4000-a001-000000000025', username: 'kieran7',      country: 'Turkey',         country_code: 'tr', equipped_avatar: '⚽', completedRounds: 14, baseScore:  7500 },
]

function jitter(base: number): number {
  return Math.round(base * (0.88 + Math.random() * 0.24))
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
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
    { onConflict: 'id', ignoreDuplicates: false }
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
