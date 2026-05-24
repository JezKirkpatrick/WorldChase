export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import type { Difficulty } from '@/types/game'

export default async function PlayPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()
  const eventRes = await supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle()
  const event = eventRes.data
  if (!event) redirect('/dashboard')

  const [challengesRes, progressRes] = await Promise.all([
    supabase.from('challenges').select('id,round_number,difficulty,points_value,location_country').eq('event_id', event.id).order('round_number'),
    supabase.from('player_progress').select('challenge_id,status,score_earned').eq('user_id', user.id).eq('event_id', event.id),
  ])

  const challenges = challengesRes.data ?? []
  const progressMap = new Map((progressRes.data ?? []).map(p => [p.challenge_id, p]))
  const completedCount = Array.from(progressMap.values()).filter(p => p.status === 'completed' || p.status === 'skipped').length
  const nextRound = completedCount + 1

  const allComplete = completedCount >= challenges.length && challenges.length > 0

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">SELECT ROUND</div>
          <h1 className="font-head font-bold text-3xl text-white">Your Rounds</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-text-muted font-head text-sm">{completedCount} of {challenges.length} complete</p>
            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-white/10 max-w-[200px]">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${challenges.length ? (completedCount / challenges.length) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #f5c518, #00d4ff)',
                }}
              />
            </div>
          </div>
        </div>

        {allComplete && (
          <div className="mb-6 border border-gold/40 p-5 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.08) 0%, rgba(15,21,53,1) 100%)' }}>
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-gold font-head font-bold tracking-widest mb-1">ALL ROUNDS COMPLETE!</div>
            <p className="text-text-muted font-head text-sm mb-3">You've conquered every location this month.</p>
            <Link href="/leaderboard" className="inline-block px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors">
              VIEW STANDINGS →
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {challenges.map(c => {
            const progress = progressMap.get(c.id)
            const status = progress?.status ?? 'locked'
            const isAvailable = c.round_number <= nextRound
            const isCompleted = status === 'completed'
            const isSkipped = status === 'skipped'
            const isActive = status === 'active'
            const isCurrent = c.round_number === nextRound && !isCompleted && !isSkipped

            return (
              <div
                key={c.id}
                className={`flex items-center justify-between border p-4 transition-all ${
                  isCompleted ? 'border-success/30 bg-success/5' :
                  isSkipped   ? 'border-white/10 opacity-60' :
                  isCurrent   ? 'border-gold/60 bg-gold/5 shadow-[0_0_20px_rgba(245,197,24,0.08)]' :
                  isActive    ? 'border-gold/30 bg-gold/3' :
                  isAvailable ? 'border-white/20 hover:border-gold/30' :
                  'border-white/5 opacity-40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-text-muted text-sm w-12 shrink-0">R{c.round_number}</span>
                  <DifficultyBadge difficulty={c.difficulty as Difficulty} />
                  <span className="font-head text-text-muted text-sm">{c.location_country}</span>
                  {isCurrent && (
                    <span className="text-xs font-head font-bold text-gold border border-gold/40 px-1.5 py-0.5 animate-pulse">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {isCompleted && (
                    <span className="text-success font-mono text-sm font-bold">
                      +{progress?.score_earned?.toLocaleString() ?? 0}
                    </span>
                  )}
                  {isSkipped && <span className="text-text-muted font-head text-xs">SKIPPED</span>}
                  <span className="font-mono text-xs text-text-muted">{c.points_value.toLocaleString()} pts</span>
                  {isAvailable && !isCompleted && !isSkipped ? (
                    <Link
                      href={`/play/${c.id}`}
                      className={`px-4 py-1.5 font-head font-bold text-xs tracking-wider transition-colors ${
                        isCurrent
                          ? 'bg-gold text-navy hover:bg-gold-dim'
                          : 'bg-white/10 text-white hover:bg-gold hover:text-navy'
                      }`}
                    >
                      {isActive ? 'CONTINUE' : 'PLAY'}
                    </Link>
                  ) : (
                    <div className="w-16 text-center text-text-muted font-head text-xs">
                      {isCompleted ? '✓' : isSkipped ? '—' : '🔒'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!allComplete && challenges.length > 0 && (
          <p className="text-center text-text-muted font-head text-xs mt-6">
            Rounds must be completed in order · 🔒 = locked until previous rounds are done
          </p>
        )}
      </div>
    </div>
  )
}
