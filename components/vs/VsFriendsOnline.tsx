'use client'
import { useEffect, useState } from 'react'
import { useOnlineUsers } from '@/components/ui/OnlineUsersProvider'
import { useRouter } from 'next/navigation'

interface Friend {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
}

function AvatarEl({ av, name }: { av: string | null; name: string }) {
  const src = av ?? '🌍'
  if (src.startsWith('http')) {
    return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover" />
  }
  return <span className="text-xl w-9 h-9 flex items-center justify-center">{src}</span>
}

export default function VsFriendsOnline() {
  const onlineIds = useOnlineUsers()
  const [friends, setFriends] = useState<Friend[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/vs/friends-list')
      .then(r => r.json())
      .then(d => setFriends(d.friends ?? []))
      .catch(() => {})
  }, [])

  const online = friends.filter(f => onlineIds.has(f.id))
  if (online.length === 0) return null

  return (
    <div className="mb-6">
      <div className="text-xs font-head text-success/80 tracking-widest mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
        FRIENDS ONLINE — {online.length}
        <div className="flex-1 h-px bg-success/10" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {online.map(f => {
          const name = f.display_name || f.username || 'Hunter'
          return (
            <button
              key={f.id}
              onClick={() => router.push(`/vs?challenge=${f.id}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 bg-navy-light border border-success/20 hover:border-success/50 px-3 py-2.5 transition-all group min-w-[72px]"
            >
              <div className="relative">
                <AvatarEl av={f.equipped_avatar} name={name} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-navy-light" />
              </div>
              <span className="font-head text-[10px] text-text-muted group-hover:text-white transition-colors truncate max-w-[64px] text-center leading-tight">
                {name}
              </span>
              <span className="font-head text-[9px] font-bold text-success tracking-widest">VS</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
