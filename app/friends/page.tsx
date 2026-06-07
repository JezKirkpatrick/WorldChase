export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import FriendButton from '@/components/ui/FriendButton'
import Avatar from '@/components/ui/Avatar'
import type { FriendStatus } from '@/components/ui/FriendButton'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'
import FriendUnreadDot from '@/components/friends/FriendUnreadDot'
import FriendsOnlineList from '@/components/friends/FriendsOnlineList'
import FindHunters from '@/components/friends/FindHunters'

type FriendProfile = {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
  equipped_border: string | null
  country_code: string | null
}

export default async function FriendsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()
  const { data: rows } = await supabase
    .from('friendships')
    .select('id,status,requester_id,addressee_id,requester:profiles!requester_id(id,username,display_name,equipped_avatar,equipped_border,country_code),addressee:profiles!addressee_id(id,username,display_name,equipped_avatar,equipped_border,country_code)')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
    .neq('status', 'declined')

  const friendships = rows ?? []

  function friendOf(f: any): FriendProfile {
    return f.requester_id === user!.id ? f.addressee : f.requester
  }

  const accepted  = friendships.filter((f: any) => f.status === 'accepted')
  const pendingIn = friendships.filter((f: any) => f.status === 'pending' && f.addressee_id === user!.id)

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />
      <div className="fixed top-20 left-1/4 w-80 h-80 bg-electric/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative">
        <h1 className="font-head font-bold text-gold tracking-widest text-xl mb-6">👥 FRIENDS</h1>

        {/* Search for new hunters */}
        <FindHunters />

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
                  <div key={f.id} className="bg-navy-light border border-electric/30 p-4 flex items-center gap-3"
                    style={{ boxShadow: '0 0 20px rgba(0,212,255,0.06)' }}>
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric/0 via-electric/40 to-electric/0" />
                    <Link href={`/profile/${safeHandle(friend)}`} className="shrink-0">
                      <Avatar
                        emoji={friend.equipped_avatar ?? '🌍'}
                        border={friend.equipped_border ?? 'none'}
                        size="sm"
                        countryCode={friend.country_code}
                      />
                    </Link>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-head font-bold text-white text-sm truncate">{safeDisplayName(friend)}</div>
                      <div className="text-text-muted font-head text-xs truncate">@{safeHandle(friend)} wants to be your hunter</div>
                    </div>
                    <FriendButton
                      targetUserId={friend.id}
                      targetUsername={safeHandle(friend)}
                      initialStatus={'pending_received' as FriendStatus}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Friends list — client component handles live presence dots */}
        <div>
          <div className="text-xs font-head text-text-muted tracking-widest mb-3 flex items-center gap-2">
            YOUR HUNTERS — {accepted.length}
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <FriendsOnlineList
            friends={accepted.map((f: any) => friendOf(f))}
            myId={user!.id}
          />
        </div>
      </div>
    </div>
  )
}
