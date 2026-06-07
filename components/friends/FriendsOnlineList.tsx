'use client'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import FriendUnreadDot from '@/components/friends/FriendUnreadDot'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'
import { useOnlineUsers } from '@/components/ui/OnlineUsersProvider'

type Friend = {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
  equipped_border: string | null
  country_code: string | null
}

interface Props {
  friends: Friend[]
  myId: string
}

export default function FriendsOnlineList({ friends, myId }: Props) {
  const onlineIds = useOnlineUsers()

  if (friends.length === 0) {
    return (
      <div className="bg-navy-light border border-white/10 p-10 text-center">
        <div className="text-5xl mb-4 opacity-40">👥</div>
        <div className="text-text-muted font-head text-sm mb-1">No friends yet</div>
        <div className="text-text-muted font-head text-xs opacity-60">Visit a hunter's profile to add them</div>
        <Link href="/leaderboard" className="inline-block mt-4 border border-gold/30 px-4 py-2 font-head text-xs font-bold text-gold tracking-widest hover:bg-gold/10 transition-all">
          🏆 BROWSE LEADERBOARD
        </Link>
      </div>
    )
  }

  const online  = friends.filter(f => onlineIds.has(f.id))
  const offline = friends.filter(f => !onlineIds.has(f.id))

  return (
    <div className="space-y-2">
      {online.length > 0 && (
        <div className="text-xs font-head text-success/70 tracking-widest mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
          ONLINE NOW — {online.length}
        </div>
      )}
      {[...online, ...offline].map((friend) => {
        const isOnline = onlineIds.has(friend.id)
        return (
          <Link key={friend.id} href={`/friends/${safeHandle(friend)}`}
            className="bg-navy-light border border-white/10 p-4 flex items-center gap-3 hover:border-electric/30 hover:bg-navy-mid/30 transition-all group">
            <div className="relative shrink-0">
              <Avatar
                emoji={friend.equipped_avatar ?? '🌍'}
                border={friend.equipped_border ?? 'none'}
                size="sm"
                countryCode={friend.country_code}
              />
              {isOnline && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-navy-light"
                  title="Online now"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-head font-bold text-white text-sm group-hover:text-electric transition-colors truncate max-w-[120px] sm:max-w-[200px]">
                  {safeDisplayName(friend)}
                </span>
                {isOnline && (
                  <span className="shrink-0 text-[10px] font-head font-bold text-success bg-success/10 border border-success/30 px-1.5 py-0.5 leading-none">
                    ONLINE
                  </span>
                )}
              </div>
              <div className="text-text-muted font-head text-xs truncate">@{safeHandle(friend)}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FriendUnreadDot myId={myId} friendId={friend.id} />
              <span className="hidden sm:inline text-text-muted font-head text-xs group-hover:text-electric transition-colors">💬 MESSAGE →</span>
              <span className="sm:hidden text-text-muted font-head text-base group-hover:text-electric transition-colors">💬</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
