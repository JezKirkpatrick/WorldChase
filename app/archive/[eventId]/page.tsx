export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import type { Difficulty } from '@/types/game'

interface PageProps { params: { eventId: string } }

export default async function ArchiveEventPage({ params }: PageProps) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()

  const [eventRes, challengesRes, progressRes] = await Promise.all([
    supabase.from('monthly_events').select('*').eq('id', params.eventId).eq('status', 'completed').maybeSingle(),
    supabase.from('challenges').select('id,round_number,difficulty,points_value,location_country').eq('event_id', params.eventId).order('round_number'),
    supabase.from('player_progress').select('challenge_id,status,score_earned').eq('user_id', user.id).eq('event_id', params.eventId),
  ])

  if (!eventRes.data) notFound()

  const event      = eventRes.data
  const challenges = challengesRes.data ?? []
  const progressMap = new Map((progressRes.data ?? []).map((p: any) => [p.challenge_id, p]))
  const completedCount = Array.from(progressMap.values()).filter((p: any) => p.status === 'completed').length

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-2">
          <Link href="/archive" className="text-xs text-text-muted font-head hover:text-gold transition-colors">
            ← BACK TO ARCHIVE
          </Link>
        </div>

        <div className="mb-8 mt-4">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">PRACTICE MODE</div>
          <h1 className="font-head font-bold text-3xl text-white">{event.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-text-muted font-head text-sm">{completedCount} of {challenges.length} complete</p>
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

        <div className="space-y-2">
          {challenges.map((c: any) => {
            const progress = progressMap.get(c.id)
            const isCompleted = progress?.status === 'completed'

            return (
              <div
                key={c.id}
                className={`flex items-center justify-between border p-3 sm:p-4 transition-all ${
                  isCompleted ? 'border-success/30 bg-success/5' : 'border-white/10 hover:border-gold/30'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <span className="font-mono text-text-muted text-sm w-8 sm:w-12 shrink-0">R{c.round_number}</span>
                  <DifficultyBadge difficulty={c.difficulty as Difficulty} />
                  <span className="font-head text-text-muted text-sm truncate max-w-[90px] sm:max-w-none">
                    {isCompleted ? c.location_country : '???'}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  {isCompleted && (
                    <span className="text-success font-mono text-sm font-bold">
                      +{progress?.score_earned?.toLocaleString() ?? 0}
                    </span>
                  )}
                  <span className="font-mono text-xs text-text-muted hidden sm:inline">
                    {c.points_value.toLocaleString()} pts
                  </span>
                  <Link
                    href={`/play/${c.id}`}
                    className={`px-4 py-1.5 font-head font-bold text-xs tracking-wider transition-colors ${
                      isCompleted
                        ? 'border border-success/40 text-success/80 hover:border-success hover:text-success'
                        : 'bg-white/10 text-white hover:bg-gold hover:text-navy'
                    }`}
                  >
                    {isCompleted ? 'REPLAY' : 'PLAY'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-text-muted font-head text-xs mt-6">
          Practice mode · Tokens earned · No leaderboard impact
        </p>
      </div>
    </div>
  )
}
