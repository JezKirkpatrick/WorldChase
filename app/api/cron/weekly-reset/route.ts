import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { EVENT_THEMES } from '@/lib/eventThemes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
      // Count all events ever to rotate through themes
      const { count: totalEvents } = await supabase
        .from('monthly_events')
        .select('id', { count: 'exact', head: true })

      const theme = EVENT_THEMES[(totalEvents ?? 0) % EVENT_THEMES.length]

      // Next Monday at midnight UTC
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

    // Hunter Pass — drop 15 tokens to every active subscriber
    const { data: subscribers } = await supabase
      .from('profiles').select('id').eq('is_subscriber', true)

    if (subscribers && subscribers.length > 0) {
      await Promise.all(subscribers.map(s => Promise.all([
        supabase.rpc('adjust_tokens', { p_user_id: s.id, p_amount: 15 }),
        supabase.from('token_transactions').insert({
          user_id: s.id, type: 'hunter_pass_weekly', amount: 15,
          description: 'Hunter Pass — weekly token drop',
        }),
      ])))
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
