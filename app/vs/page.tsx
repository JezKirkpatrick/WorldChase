export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import CreateDuelButton from '@/components/vs/CreateDuelButton'
import Avatar from '@/components/ui/Avatar'
import VsPageLive from '@/components/vs/VsPageLive'
import VsCancelButton from '@/components/vs/VsCancelButton'
import VsDeclineButton from '@/components/vs/VsDeclineButton'
import VsFriendsOnline from '@/components/vs/VsFriendsOnline'

export default async function VsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const [profile, admin] = [await getProfile(user.id), createServiceClient()]

  const now = new Date().toISOString()

  // My pending/active duels — simple select, no joins
  const { data: myMatches, error: myErr } = await admin
    .from('vs_matches')
    .select('id, wager, status, match_type, challenger_id, opponent_id, invited_friend_id, started_at')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })

  if (myErr) console.error('[VS] myMatches error:', myErr)

  // Friend invites directed at me — simple select, no joins
  const { data: friendInvites, error: friendErr } = await admin
    .from('vs_matches')
    .select('id, wager, status, match_type, challenger_id, expires_at')
    .eq('status', 'pending')
    .eq('match_type', 'friend_invite')
    .eq('invited_friend_id', user.id)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (friendErr) console.error('[VS] friendInvites error:', friendErr)

  // Challenger usernames for display — batch fetch profiles for known IDs
  const challengerIds = [
    ...new Set([
      ...(friendInvites ?? []).map((m: any) => m.challenger_id),
      ...(myMatches ?? []).map((m: any) => m.opponent_id ?? m.challenger_id),
    ].filter(Boolean))
  ]
  const { data: profiles } = challengerIds.length
    ? await admin.from('profiles').select('id, username, display_name, equipped_avatar, equipped_border').in('id', challengerIds)
    : { data: [] }
  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  function displayName(id: string | null) {
    if (!id) return 'Opponent'
    const p = profileMap[id]
    return p?.display_name || p?.username || 'Hunter'
  }

  // Open challenges from other players — simple select, no joins
  const { data: openMatches, error: openErr } = await admin
    .from('vs_matches')
    .select('id, wager, status, match_type, challenger_id, expires_at')
    .eq('status', 'pending')
    .eq('match_type', 'open')
    .neq('challenger_id', user.id)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(18)

  if (openErr) console.error('[VS] openMatches error:', openErr)

  // Pull open challenge challenger IDs too
  const openChallengerIds = (openMatches ?? []).map((m: any) => m.challenger_id).filter(Boolean)
  const missing = openChallengerIds.filter((id: string) => !profileMap[id])
  if (missing.length) {
    const { data: extra } = await admin.from('profiles').select('id, username, display_name, equipped_avatar, equipped_border').in('id', missing)
    for (const p of (extra ?? [])) profileMap[p.id] = p
  }

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
            Wager tokens against another hunter. Both see the same riddle at the same time. Intel files unlock every 30 seconds — first correct answer wins the full pot.
          </p>
        </div>

        <VsPageLive userId={user.id} />

        <VsFriendsOnline />

        {/* My pending/active duels */}
        {(myMatches ?? []).length > 0 && (
          <div className="mb-8">
            <div className="text-xs font-head text-electric tracking-widest mb-3 flex items-center gap-2">
              YOUR ACTIVE DUELS
              <div className="flex-1 h-px bg-electric/20" />
            </div>
            <div className="space-y-2">
              {(myMatches as any[]).map(m => {
                const isChallenger = m.challenger_id === user.id
                const otherId = isChallenger ? m.opponent_id : m.challenger_id
                const statusLabel = m.status === 'pending'
                  ? m.match_type === 'queue' ? '🌍 Searching for opponent...' : '⏳ Waiting for opponent to accept'
                  : `⚔️ vs ${displayName(otherId)}`
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <Link href={`/vs/${m.id}`}
                      className="flex-1 flex items-center justify-between bg-navy-light border border-electric/20 p-4 hover:border-electric/50 transition-all group">
                      <div>
                        <div className="font-head text-white text-sm font-bold">{statusLabel}</div>
                        <div className="text-text-muted font-head text-xs mt-0.5">
                          {m.match_type === 'friend_invite' ? '👥 Friend duel · ' : m.match_type === 'queue' ? '🌍 World · ' : ''}
                          Wager {m.wager} · Pot {m.wager * 2} tokens
                        </div>
                      </div>
                      <span className="text-electric font-head text-xs group-hover:text-white transition-colors">ENTER →</span>
                    </Link>
                    {m.status === 'pending' && isChallenger && (
                      <VsCancelButton matchId={m.id} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Create / Queue panel */}
        <CreateDuelButton tokens={tokens} />

        {/* Open challenges + friend invites */}
        <div className="mt-10">
          <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center gap-2">
            OPEN CHALLENGES
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Friend invites at top */}
          {(friendInvites ?? []).length > 0 && (
            <div className="space-y-2 mb-4">
              {(friendInvites as any[]).map(m => {
                const av = profileMap[m.challenger_id]?.equipped_avatar ?? '🌍'
                const br = profileMap[m.challenger_id]?.equipped_border ?? 'none'
                return (
                <div key={m.id} className="flex items-center gap-2">
                  <Link href={`/vs/${m.id}`}
                    className="flex-1 flex items-center gap-4 bg-gold/5 border border-gold/40 p-4 hover:border-gold/70 transition-all group">
                    <Avatar emoji={av} border={br} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-head font-bold text-white text-sm flex items-center gap-2">
                        {displayName(m.challenger_id)} challenged you!
                        <span className="text-[10px] font-head font-bold bg-gold text-navy px-1.5 py-0.5 rounded-full shrink-0">FRIEND</span>
                      </div>
                      <div className="text-text-muted font-head text-xs mt-0.5">
                        Wager {m.wager} tokens each · Winner takes {m.wager * 2}
                      </div>
                    </div>
                    <span className={`font-head text-xs font-bold shrink-0 ${tokens >= m.wager ? 'text-gold animate-pulse' : 'text-white/20'}`}>
                      {tokens >= m.wager ? 'ACCEPT ⚔️' : `need ${m.wager}`}
                    </span>
                  </Link>
                  <VsDeclineButton matchId={m.id} />
                </div>
                )
              })}
            </div>
          )}

          {/* Open challenges from other hunters */}
          {!(openMatches ?? []).length && !(friendInvites ?? []).length ? (
            <div className="text-center py-12 bg-navy-light border border-white/5">
              <div className="text-4xl mb-3 opacity-30">⚔️</div>
              <div className="text-text-muted font-head text-sm">No open duels yet.</div>
              <div className="text-text-muted font-head text-xs mt-1 opacity-60">Create one above or use VS World to find an opponent instantly.</div>
            </div>
          ) : (openMatches ?? []).length > 0 ? (
            <div className="space-y-2">
              {(openMatches as any[]).map(m => {
                const av = profileMap[m.challenger_id]?.equipped_avatar ?? '🌍'
                const br = profileMap[m.challenger_id]?.equipped_border ?? 'none'
                return (
                <Link key={m.id} href={`/vs/${m.id}`}
                  className="flex items-center gap-4 bg-navy-light border border-white/10 p-4 hover:border-gold/30 transition-all group">
                  <Avatar emoji={av} border={br} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-bold text-white text-sm truncate">
                      {displayName(m.challenger_id)} is challenging
                    </div>
                    <div className="text-text-muted font-head text-xs">
                      Wager {m.wager} tokens each · Winner takes {m.wager * 2}
                    </div>
                  </div>
                  <span className={`font-head text-xs font-bold shrink-0 transition-colors ${tokens >= m.wager ? 'text-gold group-hover:text-white' : 'text-white/20'}`}>
                    {tokens >= m.wager ? 'ACCEPT →' : `need ${m.wager}`}
                  </span>
                </Link>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
