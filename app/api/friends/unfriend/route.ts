import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

  // Delete in either direction (sent or received)
  await supabase.from('friendships').delete()
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)

  return NextResponse.json({ ok: true })
}
