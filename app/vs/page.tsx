export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import CreateDuelButton from '@/components/vs/CreateDuelButton'

export default async function VsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const [profile, admin] = [await getProfile(user.id), createServiceClient()]

  // My active/pending matches
  const { data: myMatches } = await admin
    .from('vs_matches')
    .select('*, challenger:profiles!challenger_id(username,display_name,equipped_avatar), opponent:profiles!opponent_id(username,display_name,equipped_avatar)')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })

  // Open challenges from other players
  const { data: openMatches } = await admin
    .from('vs_matches')
    .select('*, challenger:profiles!challenger_id(username,display_name,equipped_avatar)')
    .eq('status', 'pending')
    .neq('challenger_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  const tokens = profile?.tokens ?? 0

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">COMPETITIVE</div>
          <h1 className="font-head font-bold text-3xl text-white">⚔️ VS DUEL</h1>
          <p className="text-text-muted font-head text-sm mt-2 leading-relaxed">
            Wager tokens against another hunter. Both see the same riddle at the same time. First correct answer wins the full pot. No clue unlocks — pure knowledge.
          </p>
        </div>

        {/* Create new duel */}
        <CreateDuelButton tokens={tokens} />

        {/* My active duels */}
        {myMatches && myMatches.length > 0 && (
          <div className="mt-10">
            <div className="text-xs font-head text-electric tracking-widest mb-3 flex items-center gap-2">
              YOUR ACTIVE DUELS
              <div className="flex-1 h-px bg-electric/20" />
            </div>
            <div className="space-y-2">
              {(myMatches as any[]).map(m => {
                const isChallenger = m.challenger_id === user.id
                const other = isChallenger ? m.opponent : m.challenger
                const statusLabel = m.status === 'pending'
                  ? '⏳ Waiting for opponent'
                  : `⚔️ vs ${other?.display_name || other?.username || 'Hunter'}`

                return (
                  <Link
                    key={m.id}
                    href={`/vs/${m.id}`}
                    className="flex items-center justify-between bg-navy-light border border-electric/20 p-4 hover:border-electric/50 transition-all group"
                  >
                    <div>
                      <div className="font-head text-white text-sm font-bold">{statusLabel}</div>
                      <div className="text-text-muted font-head text-xs mt-0.5">
                        Wager {m.wager} · Pot {m.wager * 2} tokens
                      </div>
                    </div>
                    <span className="text-electric font-head text-xs group-hover:text-white transition-colors">ENTER →</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Open challenges from other hunters */}
        <div className="mt-10">
          <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center gap-2">
            OPEN CHALLENGES
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {!openMatches?.length ? (
            <div className="text-center py-12 bg-navy-light border border-white/5">
              <div className="text-4xl mb-3 opacity-30">⚔️</div>
              <div className="text-text-muted font-head text-sm">No open duels yet.</div>
              <div className="text-text-muted font-head text-xs mt-1 opacity-60">Create one above and share the link.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {(openMatches as any[]).map(m => (
                <Link
                  key={m.id}
                  href={`/vs/${m.id}`}
                  className="flex items-center gap-4 bg-navy-light border border-white/10 p-4 hover:border-gold/30 transition-all group"
                >
                  <span className="text-2xl shrink-0">{m.challenger?.equipped_avatar ?? '🌍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-bold text-white text-sm truncate">
                      {m.challenger?.display_name || m.challenger?.username || 'Hunter'} is challenging
                    </div>
                    <div className="text-text-muted font-head text-xs">
                      Wager {m.wager} tokens each &nbsp;·&nbsp; Winner takes {m.wager * 2}
                    </div>
                  </div>
                  <span className={`font-head text-xs font-bold shrink-0 transition-colors ${tokens >= m.wager ? 'text-gold group-hover:text-white' : 'text-white/20'}`}>
                    {tokens >= m.wager ? 'ACCEPT →' : `need ${m.wager}`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
