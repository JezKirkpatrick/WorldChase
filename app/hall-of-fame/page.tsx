export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Hall of Fame',
  description: "World Chase Hall of Fame — the greatest geography hunters of all time. Monthly champions and all-time legends.",
}

import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import HallOfFameClient from '@/components/hof/HallOfFameClient'

export default async function HallOfFamePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <div className="mb-8 relative">
          <div className="absolute -top-4 -left-2 text-7xl opacity-[0.07] select-none pointer-events-none">🏆</div>
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">ALL TIME</div>
          <h1 className="font-head font-bold text-3xl text-white">HALL OF FAME</h1>
          <p className="text-text-muted font-head text-sm mt-1">
            The greatest hunters across every event and VS duel — ranked by total points earned.
          </p>
        </div>

        <HallOfFameClient currentUserId={user?.id} />

      </div>
    </div>
  )
}
