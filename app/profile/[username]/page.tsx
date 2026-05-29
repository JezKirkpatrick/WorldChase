export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import Avatar from '@/components/ui/Avatar'
import AchievementGrid from '@/components/profile/AchievementGrid'
import FriendButton from '@/components/ui/FriendButton'
import type { FriendStatus } from '@/components/ui/FriendButton'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementStats } from '@/lib/achievements'
import { flagUrl } from '@/lib/flagEmoji'

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('username', params.username).maybeSingle()

  if (!profile) notFound()

  const [progressRes, lbRes] = await Promise.all([
    service.from('player_progress')
      .select('status, score_earned, time_taken_seconds, clues_revealed, challenge_id')
      .eq('user_id', profile.id),
    supabase.from('leaderboard')
      .select('rank, total_score')
      .eq('user_id', profile.id)
      .order('total_score', { ascending: false })
      .limit(1),
  ])

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

  const bestRank = lbRes.data?.[0]
  const isMe = me?.id === profile.id

  // Friendship status between viewer and this profile
  let friendStatus: FriendStatus = 'none'
  if (me && !isMe) {
    const { data: fs } = await supabase
      .from('friendships')
      .select('status,requester_id')
      .or(`and(requester_id.eq.${me.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${me.id})`)
      .maybeSingle()
    if (fs) {
      if (fs.status === 'accepted') friendStatus = 'accepted'
      else if (fs.status === 'pending' && fs.requester_id === me.id) friendStatus = 'pending_sent'
      else if (fs.status === 'pending' && fs.requester_id === profile.id) friendStatus = 'pending_received'
    }
  }

  const stats: AchievementStats = {
    completed, totalScore, bestTime, noClueWin,
    streak: profile.current_streak ?? 0,
    tokens: profile.tokens ?? 0,
    skipped, hardCompleted, extremeCompleted, perfectMonth,
  }

  const earnedCount = ACHIEVEMENTS.filter(a => a.condition(stats)).length
  const featuredAchievement = profile.equipped_badge
    ? ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
    : null

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="fixed top-20 left-1/4 w-80 h-80 bg-gold/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-64 h-64 bg-electric/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative">

        {/* Hero card */}
        <div className="bg-navy-light border border-white/10 p-6 sm:p-8 mb-5 relative overflow-hidden animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/4 to-electric/2 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/50 to-gold/0" />
          <div className="relative flex items-center gap-5">
            <div className="animate-float">
              <Avatar emoji={profile.equipped_avatar ?? '🌍'} border={profile.equipped_border ?? 'none'} size="xl" countryCode={profile.country_code} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-head font-bold text-2xl text-white">
                  {profile.display_name || profile.username}
                </h1>
                {featuredAchievement && (
                  <div className="badge-wrap">
                    <span className="text-xl">{featuredAchievement.emoji}</span>
                    <div className="badge-tip">{featuredAchievement.label} — {featuredAchievement.desc}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-text-muted font-head text-sm">
                <span>@{profile.username}</span>
                {profile.country_code && flagUrl(profile.country_code) && (
                  <img src={flagUrl(profile.country_code)} alt={profile.country_code} width={24} height={18} className="rounded-sm shadow-sm" />
                )}
              </div>
              {profile.equipped_title && (
                <div className="text-gold font-head text-sm font-bold mt-1">{profile.equipped_title}</div>
              )}
              {bestRank && (
                <div className="text-electric font-mono text-sm font-bold mt-2">
                  #{bestRank.rank} · {bestRank.total_score?.toLocaleString()} PTS
                </div>
              )}
            </div>
            {isMe ? (
              <Link href="/shop"
                className="shrink-0 px-3 py-2 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 transition-all">
                CUSTOMISE
              </Link>
            ) : me && (
              <FriendButton
                targetUserId={profile.id}
                targetUsername={profile.username}
                initialStatus={friendStatus}
              />
            )}
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
              <span className="text-text-muted ml-2 font-normal" style={{ WebkitTextFillColor: 'unset', color: '#7a7a9a' }}>
                {earnedCount}/{ACHIEVEMENTS.length}
              </span>
            </div>
            {isMe && earnedCount > 0 && (
              <span className="text-xs text-text-muted font-head">tap to feature</span>
            )}
          </div>
          <AchievementGrid stats={stats} equippedBadge={profile.equipped_badge ?? null} isMe={isMe} />
        </div>

        {/* Streak */}
        <div className="bg-navy-light border border-white/10 p-4 flex items-center gap-4 mb-5 animate-fade-up stagger-3 card-gradient-danger">
          <span className="text-3xl">🔥</span>
          <div className="flex-1">
            <div className="font-mono font-bold text-white text-xl">{profile.current_streak ?? 0} day streak</div>
            <div className="text-text-muted font-head text-xs">Login daily to build your streak and unlock bonuses</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-text-muted font-head">NEXT BONUS</div>
            <div className="text-gold font-mono text-sm font-bold">
              {(profile.current_streak ?? 0) < 3 ? 'Day 3' : (profile.current_streak ?? 0) < 7 ? 'Day 7' : 'Day 30'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up stagger-4">
          <Link href="/leaderboard"
            className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-gold/30 hover:text-gold transition-all">
            🏆 LEADERBOARD
          </Link>
          {isMe
            ? <Link href="/shop"
                className="border border-gold/30 py-3 text-center font-head font-bold text-xs tracking-widest text-gold hover:bg-gold/10 transition-all">
                🛍 SHOP
              </Link>
            : <Link href="/play"
                className="border border-gold/30 py-3 text-center font-head font-bold text-xs tracking-widest text-gold hover:bg-gold/10 transition-all">
                ▶ PLAY NOW
              </Link>
          }
        </div>
      </div>
    </div>
  )
}
