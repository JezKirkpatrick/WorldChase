export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Daily Challenge — World Chase',
  description: 'A free daily geography puzzle. Crack the location, earn tokens, and practice for the live hunt.',
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import type { Difficulty } from '@/types/game'

function todaysSeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export default async function DailyChallengePage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()

  // Pull from completed events — the daily challenge rotates through archived rounds
  const { data: challenges } = await supabase
    .from('challenges')
    .select('id,round_number,difficulty,points_value,location_country,event_id,monthly_events!inner(status)')
    .eq('monthly_events.status', 'completed')
    .order('round_number')

  const pool = challenges ?? []

  // Deterministic pick: seed based on today's date
  const daily = pool.length > 0 ? pool[todaysSeed() % pool.length] : null

  // Check if user already completed today's challenge
  const { data: existingProgress } = daily
    ? await supabase
        .from('player_progress')
        .select('status, score_earned')
        .eq('challenge_id', daily.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 text-center">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">FREE DAILY HUNT</div>
          <h1 className="font-head font-bold text-3xl text-white">Daily Challenge</h1>
          <p className="text-text-muted font-head text-sm mt-1">{dateStr}</p>
        </div>

        {!daily ? (
          <div className="border border-white/10 p-12 text-center bg-navy-light">
            <div className="text-5xl mb-4 opacity-40">📅</div>
            <div className="text-white font-head font-bold mb-2">Coming Soon</div>
            <div className="text-text-muted font-head text-sm">
              Daily challenges unlock after the first weekly hunt ends. Check back next week!
            </div>
            <Link href="/play" className="inline-block mt-4 px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors">
              PLAY THIS WEEK'S HUNT →
            </Link>
          </div>
        ) : (
          <div className="relative bg-navy-light border border-gold/30 p-8 text-center"
            style={{ boxShadow: '0 0 40px rgba(245,197,24,0.06)' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />

            <div className="text-5xl mb-4">{existingProgress?.status === 'completed' ? '✅' : '🌍'}</div>

            {existingProgress?.status === 'completed' ? (
              <>
                <div className="text-success font-head font-bold tracking-widest mb-2">CRACKED TODAY'S CHALLENGE!</div>
                <div className="text-text-muted font-head text-sm mb-1">
                  {daily.location_country}
                </div>
                <div className="text-gold font-mono font-bold text-2xl mb-6">
                  +{existingProgress.score_earned?.toLocaleString()} PTS
                </div>
                <Link href="/play" className="inline-block px-6 py-2 border border-gold/40 text-gold font-head font-bold text-sm tracking-widest hover:bg-gold/10 transition-colors">
                  PLAY THIS WEEK'S HUNT →
                </Link>
              </>
            ) : (
              <>
                <div className="text-text-muted font-head text-xs tracking-widest mb-4">TODAY'S LOCATION</div>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                  <DifficultyBadge difficulty={daily.difficulty as Difficulty} />
                  <span className="text-text-muted font-head text-sm">{daily.location_country}</span>
                </div>
                <div className="text-text-muted font-head text-sm mb-6">
                  Earn up to <span className="text-gold font-bold">{daily.points_value.toLocaleString()} pts</span> + tokens
                </div>

                <Link
                  href={`/play/${daily.id}`}
                  className="inline-block w-full py-4 text-navy font-head font-bold text-sm tracking-widest text-center transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(90deg, #f5c518, #ffd700)', boxShadow: '0 0 30px rgba(245,197,24,0.3)' }}
                >
                  START TODAY'S HUNT →
                </Link>

                <p className="text-text-muted font-head text-xs mt-4">
                  New challenge every day · Practice mode · Tokens earned
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/play" className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-gold/30 hover:text-gold transition-all">
            🏆 LIVE HUNT
          </Link>
          <Link href="/archive" className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-electric/30 hover:text-electric transition-all">
            📦 ARCHIVE
          </Link>
        </div>
      </div>
    </div>
  )
}
