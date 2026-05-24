import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const STEP_TOKENS: Record<string, number> = {
  avatar:       1,
  first_round:  2,
  three_rounds: 2,
  leaderboard:  1,
  profile:      1,
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stepIds } = await req.json() as { stepIds: string[] }
  if (!Array.isArray(stepIds) || stepIds.length === 0) {
    return NextResponse.json({ error: 'No steps provided' }, { status: 400 })
  }

  const validSteps = stepIds.filter(id => id in STEP_TOKENS)
  const totalReward = validSteps.reduce((s, id) => s + STEP_TOKENS[id], 0)

  if (totalReward > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ tokens: (profile?.tokens ?? 0) + totalReward })
      .eq('id', user.id)
  }

  return NextResponse.json({ ok: true, tokensEarned: totalReward })
}
