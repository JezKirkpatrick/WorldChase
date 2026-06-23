import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: admin } = await service.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, amount } = await req.json()
  if (!userId || !amount || typeof amount !== 'number') return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await Promise.all([
    service.rpc('adjust_tokens', { p_user_id: userId, p_amount: amount }),
    service.from('token_transactions').insert({
      user_id: userId, type: 'admin_grant', amount,
      description: `Admin grant by ${user.id}`,
    }),
  ])

  return NextResponse.json({ success: true })
}
