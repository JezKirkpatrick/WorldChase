export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import type { Difficulty } from '@/types/game'

export default async function PlayPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-6">
        <Link href="/dashboard" className="font-head font-bold text-gold text-lg tracking-widest">WORLD CHASE</Link>
        <span className="font-head text-text-muted text-sm">{event.name}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">SELECT ROUND</div>
          <h1 className="font-head font-bold text-3xl text-white">Your Rounds</h1>
          <p className="text-text-muted font-head mt-1">{completedCount} of {challenges.length} complete</p>
        </div>

        <div className="space-y-2">
          {challenges.map(c => {
            const progress = progressMap.get(c.id)
            const status = progress?.status ?? 'locked'
            const isAvailable = c.round_number <= nextRound
            const isCompleted = status === 'completed'
            const isSkipped = status === 'skipped'
            const isActive = status === 'active'

            return (
              <div key={c.id} className={`flex items-center justify-between border p-4 transition-all ${
                isCompleted ? 'border-success/30 bg-success/5' :
                isSkipped   ? 'border-white/10 opacity-60' :
                isActive    ? 'border-gold/40 bg-gold/5' :
                isAvailable ? 'border-white/20 hover:border-gold/30' :
                'border-white/5 opacity-40'
              }`}>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-text-muted text-sm w-12">R{c.round_number}</span>
                  <DifficultyBadge difficulty={c.difficulty as Difficulty} />
                  <span className="font-head text-text-muted text-sm">{c.location_country}</span>
                </div>
                <div className="flex items-center gap-4">
                  {isCompleted && <span className="text-success font-mono text-sm font-bold">+{progress?.score_earned?.toLocaleString() ?? 0}</span>}
                  {isSkipped && <span className="text-text-muted font-head text-xs">SKIPPED</span>}
                  <span className="font-mono text-xs text-text-muted">{c.points_value.toLocaleString()} pts</span>
                  {isAvailable && !isCompleted && !isSkipped ? (
                    <Link href={`/play/${c.id}`} className="px-4 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-wider hover:bg-gold-dim transition-colors">
                      {isActive ? 'CONTINUE' : 'PLAY'}
                    </Link>
                  ) : (
                    <div className="w-16 text-center text-text-muted font-head text-xs">
                      {isCompleted ? 'âœ“' : isSkipped ? 'â€”' : 'ðŸ”’'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
