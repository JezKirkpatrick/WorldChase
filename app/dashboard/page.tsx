export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import Avatar from '@/components/ui/Avatar'
import StreakWidget from '@/components/dashboard/StreakWidget'
import { ACHIEVEMENTS } from '@/lib/achievements'
import OnboardingGuide from '@/components/ui/OnboardingGuide'

const RANK_STYLE = ['text-gold', 'text-slate-300', 'text-amber-600']
const RANK_EMOJI = ['ðŸ‘‘', 'ðŸ¥ˆ', 'ðŸ¥‰']

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, eventRes, pastEventsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle(),
    supabase.from('monthly_events').select('*').eq('status', 'completed').order('ends_at', { ascending: false }).limit(3),
  ])

  const profile = profileRes.data
  const event = eventRes.data
  const pastEvents = pastEventsRes.data ?? []

  let leaderboardEntry: any = null
  let completedCount = 0
  let top5: any[] = []

  if (event) {
    const [lbRes, progressRes, top5Res] = await Promise.all([
      supabase.from('leaderboard').select('rank,total_score').eq('user_id', user.id).eq('event_id', event.id).maybeSingle(),
      supabase.from('player_progress').select('status').eq('user_id', user.id).eq('event_id', event.id),
      supabase.from('leaderboard')
        .select('rank,total_score,challenges_completed,user_id,profiles(username,equipped_avatar,equipped_border,equipped_title,equipped_badge)')
        .eq('event_id', event.id)
        .order('rank', { ascending: true })
        .limit(5),
    ])
    leaderboardEntry = lbRes.data
    completedCount = progressRes.data?.filter(p => p.status === 'completed' || p.status === 'skipped').length ?? 0
    top5 = top5Res.data ?? []
  }

  // Past events with top 3 each
  const pastWithPodiums = await Promise.all(pastEvents.map(async (e: any) => {
    const { data: podium } = await supabase.from('leaderboard')
      .select('rank,total_score,user_id,profiles(username,equipped_avatar,equipped_border)')
      .eq('event_id', e.id)
      .order('rank', { ascending: true })
      .limit(3)
    return { ...e, podium: podium ?? [] }
  }))

  const daysLeft = event ? Math.max(0, Math.ceil((new Date(event.ends_at).getTime() - Date.now()) / 86400000)) : 0
  const isNewUser = completedCount === 0

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      {/* Ambient background glows */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-gold/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-80 h-80 bg-electric/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative">

        {/* â”€â”€ TOP HERO ROW â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2 animate-fade-up stagger-1 bg-navy-light border border-white/10 p-5 flex items-center gap-4 card-hover"
            style={{ background: 'linear-gradient(135deg, #0f1535 0%, #111830 100%)' }}>
            <div className="animate-float">
              <Avatar emoji={profile?.equipped_avatar ?? 'ðŸŒ'} border={profile?.equipped_border ?? 'none'} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-text-muted font-head text-xs tracking-widest mb-0.5">WELCOME BACK, HUNTER</div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-head font-bold text-xl text-white truncate">{profile?.display_name || profile?.username || user.email}</h1>
                {profile?.equipped_badge && (() => {
                  const badge = ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
                  return badge ? (
                    <span className="badge-wrap shrink-0">
                      <span className="text-lg">{badge.emoji}</span>
                      <span className="badge-tip">{badge.label} â€” {badge.desc}</span>
                    </span>
                  ) : null
                })()}
              </div>
              {profile?.equipped_title && <div className="text-gold font-head text-xs font-bold mt-0.5">{profile.equipped_title}</div>}
              {leaderboardEntry?.rank && (
                <div className="text-gold font-mono font-bold text-sm mt-1">#{leaderboardEntry.rank} Â· {leaderboardEntry.total_score?.toLocaleString()} PTS</div>
              )}
            </div>
            <Link href="/shop" className="shrink-0 px-3 py-2 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 hover:border-gold transition-all hidden sm:block">
              SHOP â†’
            </Link>
          </div>
          <div className="animate-fade-up stagger-2">
            <StreakWidget userId={user.id} initialStreak={profile?.current_streak ?? 0} />
          </div>
        </div>

        {/* â”€â”€ STATS ROW â”€â”€ */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'TOKENS', value: profile?.tokens ?? 0, color: 'text-gold', href: '/tokens', glow: 'hover:shadow-[0_0_20px_rgba(245,197,24,0.15)]' },
            { label: 'SCORE',  value: leaderboardEntry?.total_score?.toLocaleString() ?? '0', color: 'text-electric', href: null, glow: '' },
            { label: 'ROUNDS', value: `${completedCount}/20`, color: 'text-white', href: '/play', glow: '' },
            { label: 'DAYS LEFT', value: daysLeft, color: daysLeft <= 3 ? 'text-danger' : 'text-success', href: null, glow: '' },
          ].map((s, i) => (
            <div key={s.label} className={`animate-fade-up bg-navy-light border border-white/10 p-3 text-center transition-all ${s.glow}`}
              style={{ animationDelay: `${0.1 + i * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}>
              {s.href ? (
                <Link href={s.href} className="block">
                  <div className="text-xs font-head text-text-muted tracking-widest mb-1">{s.label}</div>
                  <div className={`font-mono font-bold text-lg ${s.color}`}>{s.value}</div>
                </Link>
              ) : (
                <>
                  <div className="text-xs font-head text-text-muted tracking-widest mb-1">{s.label}</div>
                  <div className={`font-mono font-bold text-lg ${s.color}`}>{s.value}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* â”€â”€ ONBOARDING â”€â”€ */}
        <OnboardingGuide
          completedCount={completedCount}
          hasAvatar={(profile?.equipped_avatar ?? 'ðŸŒ') !== 'ðŸŒ'}
          hasLeaderboardRank={!!leaderboardEntry?.rank}
          userId={user.id}
        />

        {/* â”€â”€ HUNT + LIVE LEADERBOARD â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

          <div className="lg:col-span-3 animate-fade-up stagger-3">
            {event ? (
              <div className="h-full flex flex-col p-6 border border-gold/40 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f1535 0%, #141225 100%)', boxShadow: '0 0 40px rgba(245,197,24,0.06)' }}>
                {/* Corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2 mb-2">
                  <span className="live-badge text-xs text-danger font-head font-bold tracking-widest">LIVE HUNT</span>
                </div>
                <h2 className="font-head font-bold text-2xl text-white mb-1">{event.name}</h2>
                <p className="text-text-muted font-head text-sm mb-4">{completedCount} of 20 rounds Â· {daysLeft} days left</p>

                <div className="relative h-2 bg-white/10 overflow-hidden mb-1">
                  <div className="h-full transition-all duration-1000"
                    style={{ width: `${(completedCount / 20) * 100}%`, background: 'linear-gradient(90deg, #f5c518, #00d4ff)' }} />
                </div>
                <div className="text-xs text-text-muted font-mono mb-5">{completedCount}/20 complete</div>

                {isNewUser && (
                  <div className="text-text-muted font-head text-xs mb-4 border border-electric/20 bg-electric/5 p-3">
                    ðŸŒ Each round drops you somewhere on Earth â€” crack the riddle, explore the map, name the location.
                  </div>
                )}

                <Link href="/play" className="mt-auto inline-block w-full py-4 text-navy font-head font-bold text-sm tracking-widest text-center transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(90deg, #f5c518, #ffd700)', boxShadow: '0 0 30px rgba(245,197,24,0.35)' }}>
                  {isNewUser ? 'START THE CHASE â†’' : 'CONTINUE THE CHASE â†’'}
                </Link>
              </div>
            ) : (
              <div className="bg-navy-light border border-white/10 p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-3 animate-float">ðŸŒ</div>
                <div className="text-white font-head font-bold text-lg mb-2">No Active Hunt</div>
                <div className="text-text-muted font-head text-sm">The next chase begins on the 1st.</div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 animate-fade-up stagger-4 bg-navy-light border border-white/10 p-4"
            style={{ background: 'linear-gradient(180deg, #0f1535 0%, #0d1228 100%)' }}>
            <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center justify-between">
              <span className="live-badge text-text-muted">LIVE STANDINGS</span>
              <Link href="/leaderboard" className="text-gold hover:text-gold-dim text-xs transition-colors">SEE ALL â†’</Link>
            </div>
            {top5.length === 0 && (
              <div className="text-center text-text-muted font-head text-xs py-6">No hunters yet â€” be first!</div>
            )}
            <div className="space-y-1.5">
              {top5.map((entry: any, i: number) => {
                const p = entry.profiles
                const isMe = entry.user_id === user.id
                return (
                  <Link href={`/profile/${p?.username ?? entry.user_id}`} key={entry.user_id}
                    className={`flex items-center gap-2.5 px-2 py-2 transition-all cursor-pointer ${isMe ? 'bg-gold/10 border border-gold/25' : 'hover:bg-white/5 border border-transparent'}`}>
                    <span className={`font-mono font-bold text-sm w-6 text-center shrink-0 ${RANK_STYLE[i] ?? 'text-text-muted'}`}>
                      {RANK_EMOJI[i] ?? `#${entry.rank}`}
                    </span>
                    <span className="text-base shrink-0">{p?.equipped_avatar ?? 'ðŸŒ'}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-1 font-head text-xs font-bold ${isMe ? 'text-gold' : 'text-white'}`}>
                        <span className="truncate">{p?.username ?? 'Hunter'}{isMe ? ' (you)' : ''}</span>
                        {p?.equipped_badge && (() => {
                          const badge = ACHIEVEMENTS.find(a => a.id === p.equipped_badge)
                          return badge ? (
                            <span className="badge-wrap shrink-0">
                              <span className="text-xs leading-none">{badge.emoji}</span>
                              <span className="badge-tip">{badge.label}</span>
                            </span>
                          ) : null
                        })()}
                      </div>
                      <div className="text-text-muted font-mono text-xs">{entry.challenges_completed} rounds</div>
                    </div>
                    <div className="font-mono font-bold text-xs text-electric shrink-0">{entry.total_score?.toLocaleString()}</div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* â”€â”€ PAST EVENTS â”€â”€ */}
        {pastWithPodiums.length > 0 && (
          <div className="mb-5 animate-fade-up stagger-5">
            <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center gap-3">
              HALL OF CHAMPIONS
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastWithPodiums.map((e: any) => (
                <div key={e.id} className="bg-navy-light border border-white/10 p-4 card-hover relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
                  <div className="font-head font-bold text-white text-sm mb-0.5">{e.name}</div>
                  <div className="text-text-muted font-head text-xs mb-4">
                    {new Date(e.ends_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-end justify-center gap-2 mb-3">
                    {e.podium[1] && (
                      <div className="flex flex-col items-center gap-1">
                        <Avatar emoji={e.podium[1].profiles?.equipped_avatar ?? 'ðŸŒ'} border={e.podium[1].profiles?.equipped_border ?? 'none'} size="sm" />
                        <div className="text-xs">ðŸ¥ˆ</div>
                        <div className="w-12 h-8 bg-slate-500/20 border-t border-slate-400/30 flex items-end justify-center pb-1">
                          <span className="text-slate-300 font-mono text-xs font-bold">2</span>
                        </div>
                      </div>
                    )}
                    {e.podium[0] && (
                      <div className="flex flex-col items-center gap-1 -mb-2">
                        <Avatar emoji={e.podium[0].profiles?.equipped_avatar ?? 'ðŸŒ'} border={e.podium[0].profiles?.equipped_border ?? 'none'} size="md" />
                        <div className="text-base">ðŸ‘‘</div>
                        <div className="w-12 h-12 border-t-2 border-gold bg-gold/10 flex items-end justify-center pb-1">
                          <span className="text-gold font-mono text-sm font-bold">1</span>
                        </div>
                      </div>
                    )}
                    {e.podium[2] && (
                      <div className="flex flex-col items-center gap-1">
                        <Avatar emoji={e.podium[2].profiles?.equipped_avatar ?? 'ðŸŒ'} border={e.podium[2].profiles?.equipped_border ?? 'none'} size="sm" />
                        <div className="text-xs">ðŸ¥‰</div>
                        <div className="w-12 h-6 bg-amber-800/20 border-t border-amber-600/30 flex items-end justify-center pb-1">
                          <span className="text-amber-600 font-mono text-xs font-bold">3</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {e.podium[0] && (
                    <div className="text-center">
                      <div className="text-xs text-text-muted font-head">Champion</div>
                      <div className="text-gold font-head font-bold text-sm">{e.podium[0].profiles?.username ?? 'Unknown'}</div>
                      <div className="font-mono text-xs text-gold/70">{e.podium[0].total_score?.toLocaleString()} PTS</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* â”€â”€ QUICK LINKS â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-up" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
          {[
            { href: '/leaderboard', label: 'ðŸ† LEADERBOARD', border: 'hover:border-gold/40 hover:text-gold' },
            { href: '/shop',        label: 'ðŸ› SHOP',        border: 'hover:border-electric/40 hover:text-electric' },
            { href: '/how-to-play', label: 'ðŸ“– HOW TO PLAY', border: 'hover:border-white/30 hover:text-white' },
            { href: '/profile',     label: 'ðŸ‘¤ MY PROFILE',  border: 'hover:border-gold/40 hover:text-gold' },
            { href: '/support',     label: 'ðŸ†˜ SUPPORT',     border: 'hover:border-electric/30 hover:text-electric' },
          ].map(l => (
            <Link key={l.href} href={l.href} className={`border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted transition-all ${l.border}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
