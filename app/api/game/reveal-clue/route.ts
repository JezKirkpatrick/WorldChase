import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authClient = createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { challengeId, clueIndex } = await req.json()

    const [progressRes, profileRes, challengeRes] = await Promise.all([
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', user.id).single(),
      supabase.from('profiles').select('tokens').eq('id', user.id).single(),
      supabase.from('challenges').select('clues').eq('id', challengeId).single(),
    ])

    if (!progressRes.data || !profileRes.data || !challengeRes.data)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { tokens } = profileRes.data
    const progress  = progressRes.data
    const clues     = challengeRes.data.clues ?? []

    if (typeof clueIndex !== 'number' || clueIndex < 0 || clueIndex >= clues.length)
      return NextResponse.json({ error: 'Invalid clue index' }, { status: 400 })
    if (clueIndex <= progress.clues_revealed)
      return NextResponse.json({ error: 'Already revealed' }, { status: 400 })
    if (tokens < 1)
      return NextResponse.json({ error: 'Insufficient tokens' }, { status: 400 })

    await Promise.all([
      supabase.from('player_progress').update({
        clues_revealed: clueIndex, tokens_spent_on_clues: progress.tokens_spent_on_clues + 1,
      }).eq('id', progress.id),
      supabase.rpc('adjust_tokens', { p_user_id: user.id, p_amount: -1 }),
      supabase.from('token_transactions').insert({
        user_id: user.id, type: 'spent_clue', amount: -1, challenge_id: challengeId,
        description: `Revealed clue ${clueIndex + 1}`,
      }),
    ])

    return NextResponse.json({ success: true, newTokenBalance: tokens - 1 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
