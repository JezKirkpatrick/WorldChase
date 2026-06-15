// Revalidate every 60s — stale-while-revalidate keeps it fast
export const revalidate = 60

export const metadata = {
  title: 'Leaderboard',
  description: 'See who is leading the World Chase global leaderboard this month. Live rankings updated in real time.',
}

import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const [user, eventRes] = await Promise.all([
    getUser(),
    supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle(),
  ])
  const event = eventRes.data

  // Fetch country in parallel with event — no waterfall
  let userCountry: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('country_code')
      .eq('id', user.id)
      .maybeSingle()
    userCountry = profile?.country_code ?? null
  }

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">GLOBAL STANDINGS</div>
          <h1 className="font-head font-bold text-2xl sm:text-3xl text-white break-words">
            {event ? `${event.name.toUpperCase()} — LEADERBOARD` : 'LEADERBOARD'}
          </h1>
          {event && (
            <p className="text-text-muted font-head text-sm mt-1">
              Ends {new Date(event.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {event ? (
          <LeaderboardTable eventId={event.id} currentUserId={user?.id} userCountry={userCountry} />
        ) : (
          <div className="text-center py-20 text-text-muted font-head">No active event. Check back on the 1st.</div>
        )}
      </div>
    </div>
  )
}
