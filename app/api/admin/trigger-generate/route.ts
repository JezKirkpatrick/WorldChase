import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { EVENT_THEMES } from '@/lib/eventThemes'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DIFFICULTY_FOR_ROUND = (round: number): string =>
  round <= 5 ? 'easy' : round <= 10 ? 'medium' : round <= 15 ? 'hard' : round <= 20 ? 'extreme' : 'pro'

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

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const origin = req.headers.get('origin') ?? 'https://www.worldchase.net'

  const { data: activeEvents } = await supabase
    .from('monthly_events')
    .select('id, name')
    .eq('status', 'active')

  // Build list of events with their missing round numbers
  const eventsToGenerate: { id: string; name: string; missingRounds: number[] }[] = []
  for (const event of activeEvents ?? []) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('round_number')
      .eq('event_id', event.id)
    const existingRounds = new Set((existing ?? []).map(c => c.round_number))
    const missingRounds = []
    for (let r = 1; r <= 25; r++) {
      if (!existingRounds.has(r)) missingRounds.push(r)
    }
    if (missingRounds.length > 0) eventsToGenerate.push({ ...event, missingRounds })
  }

  if (eventsToGenerate.length === 0)
    return NextResponse.json({ success: true, message: 'All events complete' })

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

    recentExclusions = (recentChallenges ?? [])
      .filter(c => c.location_name)
      .map(c => c.location_country ? `${c.location_name}, ${c.location_country}` : c.location_name)
  }

  const results: Record<string, { generated: number; failed: number[] }> = {}

  for (const event of eventsToGenerate) {
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
    const failedRounds: number[] = []
    let generatedCount = 0

    for (let b = 0; b < event.missingRounds.length; b += 5) {
      const batch = event.missingRounds.slice(b, b + 5)
      const batchResults = await Promise.allSettled(
        batch.map(async (round) => {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const res = await fetch(`${origin}/api/admin/generate-challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
                body: JSON.stringify({
                  roundNumber: round,
                  difficulty: DIFFICULTY_FOR_ROUND(round),
                  eventId: event.id,
                  existingLocations: [...existingLocations],
                  eventTheme: theme,
                  eventName: event.name,
                }),
              })
              if (res.ok) {
                const result = await res.json()
                if (result.challenge?.location_name) return result.challenge
              }
            } catch {}
            if (attempt < 2) await new Promise(r => setTimeout(r, 1000))
          }
          return null
        })
      )
      for (let i = 0; i < batch.length; i++) {
        const r = batchResults[i]
        if (r.status === 'fulfilled' && r.value) {
          const loc = r.value.location_country
            ? `${r.value.location_name}, ${r.value.location_country}`
            : r.value.location_name
          existingLocations.push(loc)
          generatedCount++
        } else {
          failedRounds.push(batch[i])
        }
      }
    }

    results[event.name] = { generated: generatedCount, failed: failedRounds }
  }

  return NextResponse.json({ success: true, results })
}
