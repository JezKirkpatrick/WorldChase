// Revalidate every 60s — stale-while-revalidate keeps it fast
export const revalidate = 60

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const [{ data: { user } }, eventRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle(),
  ])
  const event = eventRes.data

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">GLOBAL STANDINGS</div>
          <h1 className="font-head font-bold text-3xl text-white">
            {event ? `${event.name.toUpperCase()} — LEADERBOARD` : 'LEADERBOARD'}
          </h1>
          {event && (
            <p className="text-text-muted font-head text-sm mt-1">
              Ends {new Date(event.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {event ? (
          <LeaderboardTable eventId={event.id} currentUserId={user?.id} />
        ) : (
          <div className="text-center py-20 text-text-muted font-head">No active event. Check back on the 1st.</div>
        )}
      </div>
    </div>
  )
}
