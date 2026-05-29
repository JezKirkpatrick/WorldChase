import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function randomOffset(km: number) {
  const angle = Math.random() * 2 * Math.PI
  const dist = (0.5 + Math.random() * 0.5) * km
  return { dLat: (dist * Math.cos(angle)) / 111.32, dLng: (dist * Math.sin(angle)) / 111.32 }
}

export async function POST(req: NextRequest) {
  // Allow internal server-to-server calls via CRON_SECRET header
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = internalSecret && internalSecret === process.env.CRON_SECRET

  if (!isInternal) {
    // Otherwise require an authenticated admin user
    const authClient = createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { challengeId, centerLat, centerLng, count = 3 } = await req.json()

    const hints = [
      'Something glitters near the water\'s edge.',
      'Hidden where shadows fall at noon.',
      'Seek the forgotten corner of the map.',
      'Near where paths cross and diverge.',
      'Tucked beside an ancient boundary.',
    ]

    const tokens = Array.from({ length: count }, (_, i) => {
      const spread = 1 + Math.random() * 3
      const { dLat, dLng } = randomOffset(spread)
      return {
        challenge_id: challengeId,
        lat: centerLat + dLat,
        lng: centerLng + dLng,
        radius_meters: 50,
        token_value: Math.random() > 0.7 ? 2 : 1,
        hint_text: hints[i % hints.length],
      }
    })

    const { data, error } = await supabase.from('hidden_tokens').insert(tokens).select()
    if (error) throw error

    return NextResponse.json({ tokens: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
