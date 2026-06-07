'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const OnlineUsersContext = createContext<Set<string>>(new Set())

export function useOnlineUsers() {
  return useContext(OnlineUsersContext)
}

export default function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      channel = supabase.channel('online-users', {
        config: { presence: { key: user.id } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState<{ user_id: string }>()
          const ids = new Set(
            Object.values(state).flat().map((p) => p.user_id)
          )
          setOnlineIds(ids)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({ user_id: user.id })
          }
        })
    })

    return () => { channel?.unsubscribe() }
  }, [])

  return (
    <OnlineUsersContext.Provider value={onlineIds}>
      {children}
    </OnlineUsersContext.Provider>
  )
}
