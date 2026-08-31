import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServiceClient } from '@/lib/supabase-server'
import { EVENT_THEMES } from '@/lib/eventThemes'
import {
  generateChallengeInline,
  getRecentExclusions,
  DIFFICULTY_FOR_ROUND,
  inferThemeId,
} from '@/lib/generateChallengeInline'

export const dynamic = 'force-dynamic'
// Was 60 — the new Street View content-verification step (image fetch + vision call
// per generation attempt) can push a single gap-filled street-view round past that on
// its own, let alone a run that gap-fills more than one round. Matches the other
// generation routes, which already run at 300 on this plan without issue.
export const maxDuration = 300

// cron-job.org's request timeout is hard-capped at 30s (can't be raised) but a run
// that needs to gap-fill Street View rounds can take minutes. Respond immediately and
// do the real work via waitUntil, so Vercel keeps the function alive past the response.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const isValid = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.ADMIN_SECRET}`
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  waitUntil(runCheckEvent())
  return NextResponse.json({ accepted: true })
}

// Allows the admin to manually trigger from browser or curl without needing CRON_SECRET.
// Kept synchronous (not waitUntil) — a human calling this directly wants the actual result.
export async function POST(req: NextRequest) {
  const { createClient } = await import('@/lib/supabase-server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return runCheckEvent()
}

async function runCheckEvent() {
  const supabase = createServiceClient()
  const now = new Date()

  // Complete expired active events
  await supabase.from('monthly_events')
    .update({ status: 'completed' })
    .eq('status', 'active')
    .lt('ends_at', now.toISOString())

  // Activate upcoming events whose start time has passed
  await supabase.from('monthly_events')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('starts_at', now.toISOString())

  // Auto-create next week's upcoming event if none exists
  const { data: existingUpcoming } = await supabase
    .from('monthly_events')
    .select('id')
    .eq('status', 'upcoming')
    .limit(1)

  if (!existingUpcoming || existingUpcoming.length === 0) {
    const { count: totalEvents } = await supabase
      .from('monthly_events')
      .select('id', { count: 'exact', head: true })

    const theme = EVENT_THEMES[(totalEvents ?? 0) % EVENT_THEMES.length]

    const nextMonday = new Date(now)
    const daysUntilNextMonday = ((8 - nextMonday.getUTCDay()) % 7) || 7
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilNextMonday)
    nextMonday.setUTCHours(0, 0, 0, 0)

    const weekEnd = new Date(nextMonday)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

    const weekLabel = nextMonday.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

    await supabase.from('monthly_events').insert({
      name: `${theme.label} Hunt — ${weekLabel}`,
      slug: `hunt-${nextMonday.toISOString().slice(0, 10)}`,
      month: nextMonday.getUTCMonth() + 1,
      year: nextMonday.getUTCFullYear(),
      status: 'upcoming',
      starts_at: nextMonday.toISOString(),
      ends_at: weekEnd.toISOString(),
      total_rounds: 25,
      description: theme.description,
    })
  }

  // Safety net: create active event for this week if none exists
  const { data: activeCheck } = await supabase
    .from('monthly_events')
    .select('id')
    .eq('status', 'active')
    .limit(1)

  if (!activeCheck || activeCheck.length === 0) {
    const { count: allEvents } = await supabase
      .from('monthly_events')
      .select('id', { count: 'exact', head: true })

    const fallbackTheme = EVENT_THEMES[((allEvents ?? 1) - 1) % EVENT_THEMES.length]
    const thisMonday = new Date(now)
    const dow = thisMonday.getUTCDay()
    thisMonday.setUTCDate(thisMonday.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    thisMonday.setUTCHours(0, 0, 0, 0)

    const thisWeekEnd = new Date(thisMonday)
    thisWeekEnd.setUTCDate(thisWeekEnd.getUTCDate() + 7)
    const thisWeekSlug = `hunt-${thisMonday.toISOString().slice(0, 10)}`

    const { data: existingThisWeek } = await supabase
      .from('monthly_events')
      .select('id')
      .eq('slug', thisWeekSlug)
      .maybeSingle()

    if (existingThisWeek) {
      await supabase.from('monthly_events').update({ status: 'active' }).eq('id', existingThisWeek.id)
    } else {
      const thisWeekLabel = thisMonday.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
      })
      await supabase.from('monthly_events').insert({
        name: `${fallbackTheme.label} Hunt — ${thisWeekLabel}`,
        slug: thisWeekSlug,
        month: thisMonday.getUTCMonth() + 1,
        year: thisMonday.getUTCFullYear(),
        status: 'active',
        starts_at: thisMonday.toISOString(),
        ends_at: thisWeekEnd.toISOString(),
        total_rounds: 25,
        description: fallbackTheme.description,
      })
    }
  }

  // Only fill missing rounds for active events — upcoming events are pre-generated by weekly-generate on Monday
  const { data: events } = await supabase
    .from('monthly_events')
    .select('id, name, status')
    .eq('status', 'active')

  const recentExclusions = await getRecentExclusions(supabase)
  const results = []

  for (const event of events ?? []) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('round_number')
      .eq('event_id', event.id)

    const existingRounds = new Set((existing ?? []).map(c => c.round_number))
    const missingRounds = Array.from({ length: 25 }, (_, i) => i + 1).filter(r => !existingRounds.has(r))

    if (missingRounds.length === 0) continue

    const { data: existingChallenges } = await supabase
      .from('challenges')
      .select('location_name, location_country')
      .eq('event_id', event.id)

    const existingLocations = [
      ...recentExclusions,
      ...(existingChallenges ?? [])
        .filter(c => c.location_name)
        .map(c => c.location_country ? `${c.location_name}, ${c.location_country}` : c.location_name),
    ]

    const themeId = inferThemeId(event.name)
    const theme = EVENT_THEMES.find(t => t.id === themeId) ?? EVENT_THEMES[0]

    let generatedCount = 0
    const failedRounds: number[] = []

    // Sequential — each round sees all previously picked locations, no country duplicates
    for (const round of missingRounds) {
      const result = await generateChallengeInline({
        roundNumber: round,
        difficulty: DIFFICULTY_FOR_ROUND(round),
        eventId: event.id,
        existingLocations: [...existingLocations],
        eventTheme: theme,
      })
      if (result) {
        existingLocations.push(result)
        generatedCount++
      } else {
        failedRounds.push(round)
      }
    }

    results.push({ event: event.name, status: event.status, generated: generatedCount, failed: failedRounds })
  }

  // Hunter Pass weekly token drop
  const { data: subscribers } = await supabase
    .from('profiles').select('id').eq('is_subscriber', true)

  if (subscribers && subscribers.length > 0) {
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getUTCDay()
    weekStart.setUTCDate(weekStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setUTCHours(0, 0, 0, 0)

    await Promise.all(subscribers.map(async s => {
      const { data: existing } = await supabase
        .from('token_transactions')
        .select('id')
        .eq('user_id', s.id)
        .eq('type', 'hunter_pass_weekly')
        .gte('created_at', weekStart.toISOString())
        .maybeSingle()
      if (existing) return
      await Promise.all([
        supabase.rpc('adjust_tokens', { p_user_id: s.id, p_amount: 15 }),
        supabase.from('token_transactions').insert({
          user_id: s.id, type: 'hunter_pass_weekly', amount: 15,
          description: 'Hunter Pass — weekly token drop',
        }),
      ])
    }))
  }

  return NextResponse.json({ success: true, timestamp: now.toISOString(), results })
}
