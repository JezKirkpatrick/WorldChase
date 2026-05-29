export const dynamic = 'force-dynamic'

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

        {/* ── Top 3 stat strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🥇', label: 'TOP SCORE',    desc: 'Highest all-time point total' },
            { icon: '🌍', label: 'GLOBAL STAGE', desc: 'Hunters from every corner of the world' },
            { icon: '📅', label: 'ALL EVENTS',   desc: 'Monthly events + VS duel wins all count' },
          ].map(s => (
            <div key={s.label} className="border border-white/10 bg-navy-light p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xs font-head text-gold tracking-widest">{s.label}</div>
              <div className="text-text-muted font-head text-[10px] mt-0.5 leading-snug">{s.desc}</div>
            </div>
          ))}
        </div>

        <HallOfFameClient currentUserId={user?.id} />

      </div>
    </div>
  )
}
