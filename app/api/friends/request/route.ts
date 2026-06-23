import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId || targetUserId === user.id) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('friendships').insert({
    requester_id: user.id,
    addressee_id: targetUserId,
    status: 'pending',
  })

  if (error?.code === '23505') return NextResponse.json({ error: 'Request already sent' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
