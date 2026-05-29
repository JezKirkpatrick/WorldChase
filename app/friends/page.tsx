export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import FriendButton from '@/components/ui/FriendButton'
import { flagEmoji } from '@/lib/flagEmoji'
import type { FriendStatus } from '@/components/ui/FriendButton'

type FriendProfile = { id: string; username: string | null; display_name: string | null; equipped_avatar: string | null; country_code: string | null }

function isUUID(s: string | null | undefined) {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function friendDisplayName(f: FriendProfile) {
  if (f.display_name) return f.display_name
  if (!f.username || isUUID(f.username)) return 'Hunter'
  return f.username
}

function friendHandle(f: FriendProfile) {
  if (!f.username || isUUID(f.username)) return 'new-player'
  return f.username
}

export default async function FriendsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()
  const { data: rows } = await supabase
    .from('friendships')
    .select('id,status,requester_id,addressee_id,requester:profiles!requester_id(id,username,display_name,equipped_avatar,country_code),addressee:profiles!addressee_id(id,username,display_name,equipped_avatar,country_code)')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
    .neq('status', 'declined')

  const friendships = rows ?? []

  function friendOf(f: any): FriendProfile {
    return f.requester_id === user!.id ? f.addressee : f.requester
  }

  const accepted   = friendships.filter((f: any) => f.status === 'accepted')
  const pendingIn  = friendships.filter((f: any) => f.status === 'pending' && f.addressee_id === user!.id)

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />
      <div className="fixed top-20 left-1/4 w-80 h-80 bg-electric/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative">
        <h1 className="font-head font-bold text-gold tracking-widest text-xl mb-6">👥 FRIENDS</h1>

        {/* Pending incoming requests */}
        {pendingIn.length > 0 && (
          <div className="mb-8">
            <div className="text-xs font-head text-electric tracking-widest mb-3 flex items-center gap-2">
              FRIEND REQUESTS
              <span className="bg-electric text-navy font-mono text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>
              <div className="flex-1 h-px bg-electric/20" />
            </div>
            <div className="space-y-2">
              {pendingIn.map((f: any) => {
                const friend = friendOf(f)
                return (
                  <div key={f.id} className="bg-navy-light border border-electric/20 p-4 flex items-center gap-3">
                    <div className="relative shrink-0 text-2xl leading-none">
                      <span>{friend.equipped_avatar ?? '🌍'}</span>
                      {friend.country_code && (
                        <span className="absolute -bottom-1 -right-1 text-sm leading-none">{flagEmoji(friend.country_code)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-head font-bold text-white text-sm truncate">{friendDisplayName(friend)}</div>
                      <div className="text-text-muted font-head text-xs truncate">@{friendHandle(friend)}</div>
                    </div>
                    <FriendButton
                      targetUserId={friend.id}
                      targetUsername={friendHandle(friend)}
                      initialStatus={'pending_received' as FriendStatus}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div>
          <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center gap-2">
            HUNTERS — {accepted.length}
            <div className="flex-1 h-px bg-white/5" />
          </div>
          {accepted.length === 0 ? (
            <div className="bg-navy-light border border-white/10 p-10 text-center">
              <div className="text-5xl mb-4 opacity-40">👥</div>
              <div className="text-text-muted font-head text-sm mb-1">No friends yet</div>
              <div className="text-text-muted font-head text-xs opacity-60">Visit a hunter's profile to add them</div>
              <Link href="/leaderboard" className="inline-block mt-4 border border-gold/30 px-4 py-2 font-head text-xs font-bold text-gold tracking-widest hover:bg-gold/10 transition-all">
                🏆 BROWSE LEADERBOARD
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {accepted.map((f: any) => {
                const friend = friendOf(f)
                return (
                  <Link key={f.id} href={`/friends/${friendHandle(friend)}`}
                    className="bg-navy-light border border-white/10 p-4 flex items-center gap-3 hover:border-electric/30 hover:bg-navy-mid/30 transition-all group">
                    <div className="relative shrink-0 text-2xl leading-none">
                      <span>{friend.equipped_avatar ?? '🌍'}</span>
                      {friend.country_code && (
                        <span className="absolute -bottom-1 -right-1 text-sm leading-none">{flagEmoji(friend.country_code)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-head font-bold text-white text-sm group-hover:text-electric transition-colors truncate">
                        {friendDisplayName(friend)}
                      </div>
                      <div className="text-text-muted font-head text-xs truncate">@{friendHandle(friend)}</div>
                    </div>
                    <span className="text-text-muted font-head text-xs group-hover:text-electric transition-colors shrink-0">💬 MESSAGE →</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
