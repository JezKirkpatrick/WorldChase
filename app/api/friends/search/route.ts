import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, equipped_avatar, equipped_border, country_code')
    .ilike('username', `%${q}%`)
    .neq('id', user.id)
    .limit(8)

  if (!profiles?.length) return NextResponse.json({ results: [] })

  // Fetch friendship status for each result in one query
  const ids = profiles.map(p => p.id)
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(
      ids.map(id =>
        `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
      ).join(',')
    )

  const statusMap = new Map<string, string>()
  for (const f of friendships ?? []) {
    const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
    if (f.status === 'accepted') statusMap.set(otherId, 'accepted')
    else if (f.status === 'pending' && f.requester_id === user.id) statusMap.set(otherId, 'pending_sent')
    else if (f.status === 'pending' && f.addressee_id === user.id) statusMap.set(otherId, 'pending_received')
  }

  const results = profiles.map(p => ({
    ...p,
    friendStatus: statusMap.get(p.id) ?? 'none',
  }))

  return NextResponse.json({ results })
}
