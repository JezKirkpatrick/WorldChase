import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { ACHIEVEMENTS } from '@/lib/achievements'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { achievementId } = await req.json()

  // Null = unequip. If setting, verify the user has actually earned this achievement.
  if (achievementId !== null) {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
    if (!achievement) return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 })

    // Verify from claimed_achievements table
    const { data: claimed } = await supabase
      .from('claimed_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
      .eq('achievement_id', achievementId)
      .maybeSingle()

    if (!claimed) return NextResponse.json({ error: 'Achievement not earned' }, { status: 403 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({ equipped_badge: achievementId ?? null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
