import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Daily bonus is triggered on login, not via cron
  // Cron sends reminder emails to inactive players
  return NextResponse.json({ success: true, message: 'Reminder emails would be sent here via Resend' })
}
