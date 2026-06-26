import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Mark current event completed
    const now = new Date().toISOString()
    await supabase.from('monthly_events')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lt('ends_at', now)

    // Activate upcoming events
    await supabase.from('monthly_events')
      .update({ status: 'active' })
      .eq('status', 'upcoming')
      .lte('starts_at', now)

    return NextResponse.json({ success: true, timestamp: now })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
