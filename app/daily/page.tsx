export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Daily Flag Puzzle',
  description: 'Reconstruct a world flag from scrambled pieces every day. Earn tokens and leaderboard points.',
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import FlagPuzzle from '@/components/daily/FlagPuzzle'
import { DAILY_COUNTRIES } from '@/lib/countries'

function todaysSeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export default async function DailyPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()

  const todayStr = new Date().toISOString().split('T')[0]

  // Today's country — AI-picked first, seed fallback
  const { data: flagEntry } = await supabase
    .from('daily_flags')
    .select('country_code, country_name')
    .eq('date', todayStr)
    .maybeSingle()

  const country = flagEntry
    ? { code: flagEntry.country_code, name: flagEntry.country_name }
    : DAILY_COUNTRIES[todaysSeed() % DAILY_COUNTRIES.length]

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // Run checks in parallel
  const [eventRes, completionRes] = await Promise.all([
    supabase.from('monthly_events').select('id').eq('status', 'active').maybeSingle(),
    supabase
      .from('token_transactions')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('type', 'daily_flag')
      .gte('created_at', today.toISOString())
      .maybeSingle(),
  ])

  const eventId = eventRes.data?.id ?? null
  const alreadyCompleted = !!completionRes.data

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 text-center">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">DAILY FLAG PUZZLE</div>
          <h1 className="font-head font-bold text-3xl text-white">Flag Challenge</h1>
          <p className="text-text-muted font-head text-sm mt-1">{dateStr}</p>
        </div>

        {alreadyCompleted ? (
          <div className="border border-success/30 bg-success/5 p-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <div className="text-success font-head font-bold tracking-widest">COMPLETED TODAY!</div>
            <div className="text-text-muted font-head text-sm">You solved today's flag. Come back tomorrow for a new one.</div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/play" className="inline-block px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors">
                PLAY THE HUNT →
              </Link>
              <Link href="/leaderboard" className="inline-block px-4 py-2 border border-white/20 text-text-muted font-head text-xs tracking-widest hover:border-gold/40 hover:text-gold transition-colors">
                VIEW LEADERBOARD
              </Link>
            </div>
          </div>
        ) : (
          <FlagPuzzle
            countryCode={country.code}
            countryName={country.name}
            cols={5}
            rows={4}
            eventId={eventId}
          />
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/play" className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-gold/30 hover:text-gold transition-all">
            🏆 LIVE HUNT
          </Link>
          <Link href="/leaderboard" className="border border-white/10 py-3 text-center font-head font-bold text-xs tracking-widest text-text-muted hover:border-electric/30 hover:text-electric transition-all">
            📊 LEADERBOARD
          </Link>
        </div>
      </div>
    </div>
  )
}
