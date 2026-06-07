'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function PresenceTracker() {
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      channel = supabase.channel('online-users', {
        config: { presence: { key: user.id } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({ user_id: user.id })
          }
        })
    })

    return () => {
      channel?.unsubscribe()
    }
  }, [])

  return null
}
