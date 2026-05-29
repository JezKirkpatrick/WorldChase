import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check which steps have already been claimed (idempotency guard)
  const { data: priorTxns } = await service
    .from('token_transactions')
    .select('description')
    .eq('user_id', user.id)
    .eq('type', 'earned_onboarding')

  const claimedSteps = new Set(
    (priorTxns ?? []).map(t => t.description.replace('Onboarding: ', ''))
  )

  const validSteps  = stepIds.filter(id => id in STEP_TOKENS && !claimedSteps.has(id))
  const totalReward = validSteps.reduce((s, id) => s + STEP_TOKENS[id], 0)

  if (totalReward > 0) {
    await Promise.all([
      service.rpc('adjust_tokens', { p_user_id: user.id, p_amount: totalReward }),
      service.from('token_transactions').insert(
        validSteps.map(id => ({
          user_id: user.id, type: 'earned_onboarding', amount: STEP_TOKENS[id],
          description: `Onboarding: ${id}`,
        }))
      ),
    ])
  }

  return NextResponse.json({ ok: true, tokensEarned: totalReward })
}
