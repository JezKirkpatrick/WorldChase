import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { ARENA_WAGERS } from '@/lib/arenas'
import RankedHubLive from './RankedHubLive'

export const dynamic = 'force-dynamic'

export default async function RankedPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()

  // Get all data in parallel
  const [progressResult, profileResult, invitesResult, friendshipsResult, activeMatchResult] = await Promise.all([
    admin.from('arena_progress')
      .select('current_arena, trophies, elo, win_streak')
      .eq('user_id', user.id)
      .maybeSingle(),

    admin.from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .maybeSingle(),

    // Invites sent to me
    admin.from('ranked_matches')
      .select(`
        id, arena_level, format, status,
        ranked_match_players (
          user_id,
          profiles!user_id (display_name, username, equipped_avatar)
        )
      `)
      .eq('invited_user_id', user.id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(5),

    // Accepted friends
    admin.from('friendships')
      .select(`
        requester_id, addressee_id,
        requester:profiles!requester_id (id, display_name, username, equipped_avatar),
        addressee:profiles!addressee_id (id, display_name, username, equipped_avatar)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .limit(30),

    // Check if already in an active/waiting ranked match
    admin.from('ranked_match_players')
      .select('match_id')
      .eq('user_id', user.id)
      .limit(10),
  ])

  // If already in an active/waiting match, redirect straight there
  if (activeMatchResult.data && activeMatchResult.data.length > 0) {
    const matchIds = activeMatchResult.data.map((r: any) => r.match_id)
    const { data: activeMatch } = await admin
      .from('ranked_matches')
      .select('id, status')
      .in('id', matchIds)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (activeMatch) {
      redirect(`/ranked/${activeMatch.id}`)
    }
  }

  const progress = progressResult.data
  const tokens = profileResult.data?.tokens ?? 0

  // Shape pending invites
  const pendingInvites = (invitesResult.data ?? []).map((m: any) => {
    const inviterPlayer = (m.ranked_match_players ?? []).find((p: any) => p.user_id !== user.id)
    const prof = inviterPlayer?.profiles
    return {
      id: m.id,
      arena_level: m.arena_level,
      format: m.format,
      wager: ARENA_WAGERS[m.arena_level as number] ?? 10,
      inviterName: prof?.display_name ?? prof?.username ?? 'Hunter',
      inviterAvatar: prof?.equipped_avatar ?? null,
    }
  })

  // Shape friends list
  const friends = (friendshipsResult.data ?? []).map((f: any) => {
    const friend = f.requester_id === user.id ? f.addressee : f.requester
    return {
      id: friend?.id,
      display_name: friend?.display_name ?? null,
      username: friend?.username ?? null,
      equipped_avatar: friend?.equipped_avatar ?? null,
    }
  }).filter((f: any) => f.id && f.id !== user.id)

  return (
    <>
      {/* Header */}
      <div className="bg-navy-light border-b border-white/10 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚔️</div>
            <div>
              <h1 className="font-head font-bold text-2xl text-white tracking-wide">ARENA</h1>
              <p className="text-text-muted font-head text-xs tracking-widest">
                RANKED COMPETITIVE MODE
              </p>
            </div>
            <div className="ml-auto text-right">
              <div className="font-mono font-bold text-gold text-lg">{tokens} 🪙</div>
              <div className="text-text-muted font-head text-xs">your balance</div>
            </div>
          </div>
        </div>
      </div>

      <RankedHubLive
        progress={progress as any}
        pendingInvites={pendingInvites}
        friends={friends}
        tokens={tokens}
      />
    </>
  )
}
