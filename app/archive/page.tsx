export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Hunt Archive',
  description: 'Replay every past World Chase hunt in practice mode. Explore previous locations, earn tokens, and sharpen your geography skills without affecting live standings.',
  keywords: ['geography game archive', 'past geography quizzes', 'practice geography game', 'replay world chase'],
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import Avatar from '@/components/ui/Avatar'

export default async function ArchivePage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()
  const { data: events } = await supabase
    .from('monthly_events')
    .select('*')
    .eq('status', 'completed')
    .order('ends_at', { ascending: false })

  const pastEvents = events ?? []

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">PRACTICE MODE</div>
          <h1 className="font-head font-bold text-3xl text-white">Hunt Archive</h1>
          <p className="text-text-muted font-head text-sm mt-1">
            Replay past hunts. Earn tokens but no leaderboard points.
          </p>
        </div>

        {pastEvents.length === 0 ? (
          <div className="border border-white/10 p-12 text-center bg-navy-light">
            <div className="text-5xl mb-4 opacity-40">📦</div>
            <div className="text-text-muted font-head text-sm">
              No past hunts yet — the archive fills after the first month ends.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pastEvents.map((event: any) => (
              <Link
                key={event.id}
                href={`/archive/${event.id}`}
                className="block bg-navy-light border border-white/10 p-5 hover:border-gold/30 hover:bg-navy-mid/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-head font-bold text-white group-hover:text-gold transition-colors">
                      {event.name}
                    </div>
                    <div className="text-text-muted font-head text-xs mt-0.5">
                      {new Date(event.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' — '}
                      {new Date(event.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0 ml-3">
                    <span className="text-xs font-head text-text-muted border border-white/10 px-2 py-1">
                      20 ROUNDS
                    </span>
                    <span className="text-gold font-head text-xs font-bold group-hover:translate-x-1 transition-transform">
                      PLAY →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 border border-electric/20 bg-electric/5 p-4">
          <div className="text-electric font-head text-xs font-bold mb-1">PRACTICE MODE RULES</div>
          <ul className="text-text-muted font-head text-xs space-y-1">
            <li>· Completing archive rounds earns tokens (1 per correct answer)</li>
            <li>· Scores do not affect the live leaderboard</li>
            <li>· Clue costs still apply — easy rounds are always free</li>
            <li>· Great for practice before the next live hunt</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
