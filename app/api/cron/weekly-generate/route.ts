import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { EVENT_THEMES } from '@/lib/eventThemes'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DIFFICULTY_FOR_ROUND = (round: number): string =>
  round <= 5 ? 'easy' : round <= 10 ? 'medium' : round <= 15 ? 'hard' : 'extreme'

function inferThemeId(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('asia') || n.includes('pacific')) return 'asia_pacific'
  if (n.includes('america')) return 'americas'
  if (n.includes('africa') || n.includes('middle')) return 'africa_middle'
  if (n.includes('europe') || n.includes('hidden')) return 'europe_hidden'
  if (n.includes('natural') || n.includes('wonder')) return 'natural_wonders'
  if (n.includes('ancient') || n.includes('civiliz')) return 'ancient_worlds'
  if (n.includes('island')) return 'islands'
  if (n.includes('urban')) return 'urban_jungle'
  if (n.includes('extreme') || n.includes('remote')) return 'extreme_remote'
  return 'global'
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Find active events that have no challenges yet
    const { data: activeEvents } = await supabase
      .from('monthly_events')
      .select('id, name')
      .eq('status', 'active')

    const eventsToGenerate: { id: string; name: string }[] = []
    for (const event of activeEvents ?? []) {
      const { count } = await supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
      if ((count ?? 0) === 0) eventsToGenerate.push(event)
    }

    if (eventsToGenerate.length === 0) {
      return NextResponse.json({ success: true, message: 'No events need generation' })
    }

    // Collect locations + countries from the last 2 completed events to block repeats
    const { data: recentEvents } = await supabase
      .from('monthly_events')
      .select('id')
      .eq('status', 'completed')
      .order('ends_at', { ascending: false })
      .limit(2)

    const recentEventIds = (recentEvents ?? []).map(e => e.id)
    let recentExclusions: string[] = []

    if (recentEventIds.length > 0) {
      const { data: recentChallenges } = await supabase
        .from('challenges')
        .select('location_name, location_country')
        .in('event_id', recentEventIds)

      // Pass as "Location, Country" so AI avoids both the place AND the country
      recentExclusions = (recentChallenges ?? [])
        .filter(c => c.location_name)
        .map(c => c.location_country ? `${c.location_name}, ${c.location_country}` : c.location_name)
    }

    const origin = req.nextUrl.origin
    const results = []

    for (const event of eventsToGenerate) {
      const themeId = inferThemeId(event.name)
      const theme = EVENT_THEMES.find(t => t.id === themeId) ?? EVENT_THEMES[0]
      const existingLocations = [...recentExclusions]
      const failedRounds: number[] = []
      let generatedCount = 0

      for (let round = 1; round <= 20; round++) {
        try {
          const res = await fetch(`${origin}/api/admin/generate-challenge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cron-secret': process.env.CRON_SECRET ?? '',
            },
            body: JSON.stringify({
              roundNumber: round,
              difficulty: DIFFICULTY_FOR_ROUND(round),
              eventId: event.id,
              existingLocations,
              eventTheme: theme,
              eventName: event.name,
            }),
          })

          if (res.ok) {
            const result = await res.json()
            if (result.challenge?.location_name) {
              const loc = result.challenge.location_country
                ? `${result.challenge.location_name}, ${result.challenge.location_country}`
                : result.challenge.location_name
              existingLocations.push(loc)
              generatedCount++
            } else {
              failedRounds.push(round)
            }
          } else {
            failedRounds.push(round)
          }
        } catch {
          failedRounds.push(round)
        }
      }

      results.push({ eventId: event.id, eventName: event.name, generatedCount, failedRounds })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
