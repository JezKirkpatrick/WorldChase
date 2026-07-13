import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { EVENT_THEMES } from '@/lib/eventThemes'
import {
  generateChallengeInline,
  getRecentExclusions,
  DIFFICULTY_FOR_ROUND,
  inferThemeId,
} from '@/lib/generateChallengeInline'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Allow CRON_SECRET (for server-side triggering) or logged-in admin
  const auth = req.headers.get('authorization')
  const isCron = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const supabaseAuth = createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { eventId } = body

  const supabase = createServiceClient()

  // If a specific eventId is passed, only fill that one; otherwise fill all active+upcoming
  const query = supabase.from('monthly_events').select('id, name, status')
  if (eventId) {
    query.eq('id', eventId)
  } else {
    query.in('status', ['active', 'upcoming'])
  }
  const { data: events } = await query

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, message: 'No events found' })
  }

  const recentExclusions = await getRecentExclusions(supabase)
  const results = []

  for (const event of events) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('round_number')
      .eq('event_id', event.id)

    const existingRounds = new Set((existing ?? []).map(c => c.round_number))
    const missingRounds = Array.from({ length: 25 }, (_, i) => i + 1).filter(r => !existingRounds.has(r))

    if (missingRounds.length === 0) {
      results.push({ event: event.name, generated: 0, failed: [], message: 'Already complete' })
      continue
    }

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

    for (let b = 0; b < missingRounds.length; b += 5) {
      const batch = missingRounds.slice(b, b + 5)
      const batchResults = await Promise.allSettled(
        batch.map(round => generateChallengeInline({
          roundNumber: round,
          difficulty: DIFFICULTY_FOR_ROUND(round),
          eventId: event.id,
          existingLocations: [...existingLocations],
          eventTheme: theme,
        }))
      )

      for (let i = 0; i < batch.length; i++) {
        const r = batchResults[i]
        if (r.status === 'fulfilled' && r.value) {
          existingLocations.push(r.value)
          generatedCount++
        } else {
          failedRounds.push(batch[i])
        }
      }
    }

    results.push({ event: event.name, status: event.status, generated: generatedCount, failed: failedRounds })
  }

  return NextResponse.json({ success: true, results })
}
