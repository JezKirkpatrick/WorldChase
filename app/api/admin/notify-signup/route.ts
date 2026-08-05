import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/pushNotifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { username } = await req.json().catch(() => ({}))
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true)

  await Promise.allSettled(
    (admins ?? []).map(a =>
      sendPushToUser(a.id, '🆕 New hunter joined', `${username} just signed up to World Chase`, '/admin/players')
    )
  )

  return NextResponse.json({ ok: true })
}
