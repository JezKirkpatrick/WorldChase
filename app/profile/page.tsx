export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import Avatar from '@/components/ui/Avatar'
import AchievementGrid from '@/components/profile/AchievementGrid'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementStats } from '@/lib/achievements'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('player_progress')
      .select('status, score_earned, time_taken_seconds, clues_revealed, challenges(difficulty)')
      .eq('user_id', user.id),
  ])

  const profile = profileRes.data
  const progress = progressRes.data ?? []

  const completed = progress.filter((p: any) => p.status === 'completed').length
  const skipped = progress.filter((p: any) => p.status === 'skipped').length
  const totalScore = progress.reduce((s: number, p: any) => s + (p.score_earned ?? 0), 0)
  const times = progress.filter((p: any) => p.time_taken_seconds && p.status === 'completed').map((p: any) => p.time_taken_seconds as number)
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

  const earnedCount = ACHIEVEMENTS.filter(a => a.condition(stats)).length
  const featuredAchievement = profile?.equipped_badge
    ? ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
    : null

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="fixed top-20 left-1/4 w-80 h-80 bg-gold/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-64 h-64 bg-electric/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative">

        {/* Hero */}
        <div className="bg-navy-light border border-white/10 p-6 sm:p-8 mb-5 relative overflow-hidden animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-electric/2 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/50 to-gold/0" />
          <div className="relative flex items-center gap-5">
            <div className="animate-float">
              <Avatar emoji={profile?.equipped_avatar ?? 'ðŸŒ'} border={profile?.equipped_border ?? 'none'} size="xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-head font-bold text-2xl text-white">
                  {profile?.display_name || profile?.username}
                </h1>
                {featuredAchievement && (
                  <div className="badge-wrap">
                    <span className="text-xl">{featuredAchievement.emoji}</span>
                    <div className="badge-tip">{featuredAchievement.label} â€” {featuredAchievement.desc}</div>
                  </div>
                )}
              </div>
              <div className="text-text-muted font-head text-sm">@{profile?.username}</div>
              {profile?.equipped_title && (
                <div className="text-gold font-head text-sm font-bold mt-1">{profile.equipped_title}</div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gold font-mono text-sm font-bold">ðŸª™ {profile?.tokens ?? 0} tokens</span>
                <span className="text-text-muted font-head text-xs">Â·</span>
                <span className="text-electric font-head text-xs">{earnedCount}/{ACHIEVEMENTS.length} badges</span>
              </div>
            </div>
            <Link href="/shop"
              className="shrink-0 px-3 py-2 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 transition-all">
              CUSTOMISE â†’
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up stagger-1">
          {[
            { label: 'ROUNDS WON', value: completed, color: 'text-gold' },
            { label: 'TOTAL SCORE', value: totalScore.toLocaleString(), color: 'text-electric' },
            { label: 'BEST TIME', value: bestTime === Infinity ? 'â€”' : `${Math.floor(bestTime / 60)}m ${(bestTime % 60).toString().padStart(2,'0')}s`, color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="bg-navy-light border border-white/10 p-4 text-center card-gradient-gold">
              <div className="text-xs font-head text-text-muted tracking-widest mb-1">{s.label}</div>
              <div className={`font-mono font-bold text-lg ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="bg-navy-light border border-white/10 p-5 mb-5 relative overflow-hidden animate-fade-up stagger-2">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/30 to-gold/0" />
          <div className="flex items-center justify-between mb-4">
            <div className="section-title font-head font-bold text-sm tracking-widest">
              ACHIEVEMENTS
              <span className="ml-2 font-normal" style={{ WebkitTextFillColor: 'unset', color: '#7a7a9a' }}>
                {earnedCount}/{ACHIEVEMENTS.length}
              </span>
            </div>
            {earnedCount > 0 && (
              <span className="text-xs text-text-muted font-head">tap to feature</span>
            )}
          </div>
          <AchievementGrid stats={stats} equippedBadge={profile?.equipped_badge ?? null} isMe={true} />
        </div>

        {/* Streak */}
        <div className="bg-navy-light border border-white/10 p-4 flex items-center gap-4 mb-5 animate-fade-up stagger-3 card-gradient-danger">
          <span className="text-3xl">ðŸ”¥</span>
          <div className="flex-1">
            <div className="font-mono font-bold text-white text-xl">{profile?.current_streak ?? 0} day streak</div>
            <div className="text-text-muted font-head text-xs">Log in daily to keep your streak â€” milestones grant bonus tokens</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-text-muted font-head">NEXT BONUS</div>
            <div className="text-gold font-mono text-sm font-bold">
              {(profile?.current_streak ?? 0) < 3 ? 'Day 3 (+2ðŸª™)' : (profile?.current_streak ?? 0) < 7 ? 'Day 7 (+5ðŸª™)' : 'Day 30 (+20ðŸª™)'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up stagger-4">
          <Link href="/shop"
            className="border border-gold/30 py-3 text-center font-head font-bold text-xs tracking-widest text-gold hover:bg-gold/10 transition-all">
            ðŸ› SHOP
          </Link>
          <Link href="/leaderboard"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-gold/30 hover:text-gold transition-all">
            ðŸ† RANKINGS
          </Link>
          <Link href="/settings"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-white/30 hover:text-white transition-all">
            âš™ SETTINGS
          </Link>
          <Link href="/support"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-electric/30 hover:text-electric transition-all">
            ðŸ†˜ SUPPORT
          </Link>
        </div>
      </div>
    </div>
  )
}
