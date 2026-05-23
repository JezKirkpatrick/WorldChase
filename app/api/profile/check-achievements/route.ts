import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementStats } from '@/lib/achievements'

export async function POST(_req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, progressRes, claimedRes] = await Promise.all([
    supabase.from('profiles').select('tokens, current_streak').eq('id', user.id).single(),
    supabase.from('player_progress')
      .select('status, score_earned, time_taken_seconds, clues_revealed, challenges(difficulty)')
      .eq('user_id', user.id),
    supabase.from('claimed_achievements')
      .select('achievement_id')
      .eq('user_id', user.id),
  ])

  const profile = profileRes.data
  const progress = progressRes.data ?? []
  const claimed = new Set((claimedRes.data ?? []).map((c: any) => c.achievement_id))

  const completed = progress.filter((p: any) => p.status === 'completed').length
  const skipped = progress.filter((p: any) => p.status === 'skipped').length
  const totalScore = progress.reduce((s: number, p: any) => s + (p.score_earned ?? 0), 0)
  const times = progress
    .filter((p: any) => p.status === 'completed' && p.time_taken_seconds)
    .map((p: any) => p.time_taken_seconds as number)
  const bestTime = times.length ? Math.min(...times) : Infinity
  const noClueWin = progress.some((p: any) => p.status === 'completed' && (p.clues_revealed ?? 1) === 0)
  const hardCompleted = progress.filter((p: any) =>
    p.status === 'completed' && (p.challenges as any)?.difficulty === 'hard'
  ).length
  const extremeCompleted = progress.filter((p: any) =>
    p.status === 'completed' && (p.challenges as any)?.difficulty === 'extreme'
  ).length
  const perfectMonth = completed >= 20 && skipped === 0

  const stats: AchievementStats = {
    completed, totalScore, bestTime, noClueWin,
    streak: profile?.current_streak ?? 0,
    tokens: profile?.tokens ?? 0,
    skipped, hardCompleted, extremeCompleted, perfectMonth,
  }

  const newlyEarned = ACHIEVEMENTS.filter(a => !claimed.has(a.id) && a.condition(stats))
  if (newlyEarned.length === 0) {
    return NextResponse.json({ newAchievements: [], tokensEarned: 0 })
  }

  const totalReward = newlyEarned.reduce((s, a) => s + a.tokenReward, 0)
  const inserts = newlyEarned.map(a => ({ user_id: user.id, achievement_id: a.id }))

  await supabase.from('claimed_achievements').insert(inserts)

  if (totalReward > 0) {
    const currentTokens = profile?.tokens ?? 0
    await supabase.from('profiles')
      .update({ tokens: currentTokens + totalReward })
      .eq('id', user.id)
  }

  return NextResponse.json({ newAchievements: newlyEarned, tokensEarned: totalReward })
}
