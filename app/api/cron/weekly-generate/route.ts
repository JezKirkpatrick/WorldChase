import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServiceClient } from '@/lib/supabase-server'
import {
  generateChallengeInline,
  getRecentExclusions,
  DIFFICULTY_FOR_ROUND,
  inferThemeId,
  EVENT_THEMES,
} from '@/lib/generateChallengeInline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// cron-job.org's request timeout is hard-capped at 30s (can't be raised, even on paid
// tiers) but generating 25 rounds of AI challenges takes minutes. Respond immediately
// and do the real work via waitUntil so Vercel keeps the function alive (up to
// maxDuration) after the HTTP response is sent, instead of the connection getting
// killed at 30s with zero challenges written.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  waitUntil(runWeeklyGenerate())
  return NextResponse.json({ accepted: true })
}

async function runWeeklyGenerate() {
  const supabase = createServiceClient()

  const { data: activeEvents } = await supabase
    .from('monthly_events')
    .select('id, name')
    .eq('status', 'active')

  const eventsToFill: { id: string; name: string; missing: number[] }[] = []

  for (const event of activeEvents ?? []) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('round_number')
      .eq('event_id', event.id)

    const existingRounds = new Set((existing ?? []).map(c => c.round_number))
    const missing = Array.from({ length: 25 }, (_, i) => i + 1).filter(r => !existingRounds.has(r))
    if (missing.length > 0) eventsToFill.push({ id: event.id, name: event.name, missing })
  }

  if (eventsToFill.length === 0) {
    console.log('[weekly-generate] No events need generation')
    return
  }

  const recentExclusions = await getRecentExclusions(supabase)
  const results = []

  for (const event of eventsToFill) {
    const themeId = inferThemeId(event.name)
    const theme = EVENT_THEMES.find(t => t.id === themeId) ?? EVENT_THEMES[0]

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

    let generatedCount = 0
    const failedRounds: number[] = []

    // Sequential — each round sees all previously picked locations, no country duplicates
    for (const round of event.missing) {
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

    // Second pass: retry any rounds that failed in the first pass
    if (failedRounds.length > 0) {
      for (const round of failedRounds) {
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
        }
      }
    }

    results.push({ eventId: event.id, eventName: event.name, generatedCount, failedRounds })
  }

  console.log('[weekly-generate] Done', JSON.stringify(results))
}
