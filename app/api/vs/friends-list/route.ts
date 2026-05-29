import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: rows } = await admin
    .from('friendships')
    .select('requester_id, addressee_id, requester:profiles!requester_id(id,username,display_name,equipped_avatar), addressee:profiles!addressee_id(id,username,display_name,equipped_avatar)')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friends = (rows ?? []).map((f: any) =>
    f.requester_id === user.id ? f.addressee : f.requester
  )

  return NextResponse.json({ friends })
}
