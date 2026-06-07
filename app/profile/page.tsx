export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import Avatar from '@/components/ui/Avatar'
import AchievementGrid from '@/components/profile/AchievementGrid'
import InviteFriendsButton from '@/components/ui/InviteFriendsButton'
import ShareButton from '@/components/ui/ShareButton'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementStats } from '@/lib/achievements'
import { flagUrl } from '@/lib/flagEmoji'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()
  const service = createServiceClient()
  const [profileRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    service.from('player_progress')
      .select('status, score_earned, time_taken_seconds, clues_revealed, challenge_id')
      .eq('user_id', user.id),
  ])

  const profile = profileRes.data
  const progress = progressRes.data ?? []

  const completedRows = progress.filter((p: any) => p.status === 'completed')
  const completed = completedRows.length
  const skipped = progress.filter((p: any) => p.status === 'skipped').length
  const totalScore = progress.reduce((s: number, p: any) => s + (p.score_earned ?? 0), 0)
  const times = completedRows.filter((p: any) => p.time_taken_seconds).map((p: any) => p.time_taken_seconds as number)
  const bestTime = times.length ? Math.min(...times) : Infinity
  const noClueWin = completedRows.some((p: any) => (p.clues_revealed ?? 1) === 0)

  // Fetch difficulties for completed challenges separately to avoid join issues
  const completedChallengeIds = completedRows.map((p: any) => p.challenge_id).filter(Boolean)
  let hardCompleted = 0
  let extremeCompleted = 0
  if (completedChallengeIds.length > 0) {
    const { data: diffData } = await service.from('challenges')
      .select('id, difficulty')
      .in('id', completedChallengeIds)
    const diffMap = new Map((diffData ?? []).map((c: any) => [c.id, c.difficulty]))
    hardCompleted = completedRows.filter((p: any) => diffMap.get(p.challenge_id) === 'hard').length
    extremeCompleted = completedRows.filter((p: any) => diffMap.get(p.challenge_id) === 'extreme').length
  }

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
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="animate-float shrink-0">
              <Avatar emoji={profile?.equipped_avatar ?? '🌍'} border={profile?.equipped_border ?? 'none'} size="xl" countryCode={profile?.country_code} />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="font-head font-bold text-2xl text-white">
                  {safeDisplayName(profile)}
                </h1>
                {featuredAchievement && (
                  <div className="badge-wrap">
                    <span className="text-xl">{featuredAchievement.emoji}</span>
                    <div className="badge-tip">{featuredAchievement.label} — {featuredAchievement.desc}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-text-muted font-head text-sm">
                <span>@{safeHandle(profile)}</span>
                {profile?.country_code && flagUrl(profile.country_code) && (
                  <img src={flagUrl(profile.country_code)} alt={profile.country_code} width={24} height={18} className="rounded-sm shadow-sm" />
                )}
              </div>
              {profile?.equipped_title && (
                <div className="text-gold font-head text-sm font-bold mt-1">{profile.equipped_title}</div>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                <span className="text-gold font-mono text-sm font-bold">🪙 {profile?.tokens ?? 0} tokens</span>
                <span className="text-text-muted font-head text-xs">·</span>
                <span className="text-electric font-head text-xs">{earnedCount}/{ACHIEVEMENTS.length} badges</span>
              </div>
              <Link href="/shop"
                className="inline-block mt-3 sm:hidden px-4 py-3 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 transition-all">
                CUSTOMISE →
              </Link>
            </div>
            <Link href="/shop"
              className="shrink-0 px-3 py-2 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 transition-all hidden sm:block">
              CUSTOMISE →
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up stagger-1">
          {[
            { label: 'ROUNDS WON', value: completed, color: 'text-gold' },
            { label: 'TOTAL SCORE', value: totalScore.toLocaleString(), color: 'text-electric' },
            { label: 'BEST TIME', value: bestTime === Infinity ? '—' : `${Math.floor(bestTime / 60)}m ${(bestTime % 60).toString().padStart(2,'0')}s`, color: 'text-white' },
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
          <span className="text-3xl">🔥</span>
          <div className="flex-1">
            <div className="font-mono font-bold text-white text-xl">{profile?.current_streak ?? 0} day streak</div>
            <div className="text-text-muted font-head text-xs">Log in daily to keep your streak — milestones grant bonus tokens</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-text-muted font-head">NEXT BONUS</div>
            <div className="text-gold font-mono text-sm font-bold">
              {(profile?.current_streak ?? 0) < 3 ? 'Day 3 (+2🪙)' : (profile?.current_streak ?? 0) < 7 ? 'Day 7 (+5🪙)' : 'Day 30 (+20🪙)'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-up stagger-4">
          <Link href="/shop"
            className="border border-gold/30 py-3 text-center font-head font-bold text-xs tracking-widest text-gold hover:bg-gold/10 transition-all">
            🛍 SHOP
          </Link>
          <Link href="/leaderboard"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-gold/30 hover:text-gold transition-all">
            🏆 RANKINGS
          </Link>
          <Link href="/settings"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-white/30 hover:text-white transition-all">
            ⚙ SETTINGS
          </Link>
          <Link href="/support"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-electric/30 hover:text-electric transition-all">
            🆘 SUPPORT
          </Link>
          <InviteFriendsButton className="border border-[#1877f2]/40 py-3 text-center font-head font-bold text-xs tracking-widest text-[#1877f2] hover:bg-[#1877f2]/10 hover:border-[#1877f2] transition-all" />
          <ShareButton className="border border-electric/30 py-3 text-center font-head font-bold text-xs tracking-widest text-electric hover:bg-electric/10 hover:border-electric transition-all" />
        </div>
      </div>
    </div>
  )
}
