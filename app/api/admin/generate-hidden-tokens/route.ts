import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function randomOffset(km: number) {
  const angle = Math.random() * 2 * Math.PI
  const dist = (0.5 + Math.random() * 0.5) * km
  return { dLat: (dist * Math.cos(angle)) / 111.32, dLng: (dist * Math.sin(angle)) / 111.32 }
}

export async function POST(req: NextRequest) {
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
