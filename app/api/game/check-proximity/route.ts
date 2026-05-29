import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180) - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { challengeId, lat, lng } = await req.json()
    const service = createServiceClient()

    const [tokensRes, discoveredRes] = await Promise.all([
      service.from('hidden_tokens').select('*').eq('challenge_id', challengeId),
      service.from('token_discoveries').select('hidden_token_id').eq('user_id', user.id).eq('challenge_id', challengeId),
    ])

    const tokens     = tokensRes.data ?? []
    const discovered = new Set((discoveredRes.data ?? []).map(d => d.hidden_token_id))
    const discoveries: string[] = []
    const blips = []

    for (const token of tokens) {
      const dist = haversineMeters(lat, lng, token.lat, token.lng)
      const bear = bearing(lat, lng, token.lat, token.lng)

      if (dist <= 500 && !discovered.has(token.id)) {
        blips.push({ bearing: bear, distance: dist, intensity: 1 - dist / 500 })
      }

      if (dist <= token.radius_meters && !discovered.has(token.id)) {
        // Attempt atomic insert — unique constraint on (user_id, hidden_token_id) prevents duplicates
        const { error: insErr } = await service.from('token_discoveries').insert({
          user_id: user.id, hidden_token_id: token.id, challenge_id: challengeId,
        })

        if (!insErr) {
          // Insert succeeded — token not yet claimed by this user
          discoveries.push(token.id)
          discovered.add(token.id) // prevent double-spend within this same request

          await Promise.all([
            service.rpc('adjust_tokens', { p_user_id: user.id, p_amount: token.token_value }),
            service.from('token_transactions').insert({
              user_id: user.id, type: 'earned_hidden', amount: token.token_value,
              hidden_token_id: token.id, challenge_id: challengeId, description: 'Hidden token found',
            }),
          ])
        }
        // If insErr is a unique violation (23505), another request already claimed it — skip silently
      }
    }

    // Increment hidden_tokens_found counter once for all new discoveries
    if (discoveries.length > 0) {
      const { data: prog } = await service.from('player_progress')
        .select('hidden_tokens_found')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single()

      await service.from('player_progress').update({
        hidden_tokens_found: (prog?.hidden_tokens_found ?? 0) + discoveries.length,
      }).eq('user_id', user.id).eq('challenge_id', challengeId)
    }

    return NextResponse.json({ blips, discoveries })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
