'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function FriendUnreadDot({ myId, friendId }: { myId: string; friendId: string }) {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const lastRead = localStorage.getItem(`wc_dm_read_${myId}_${friendId}`)
    const since = lastRead ? new Date(parseInt(lastRead)).toISOString() : new Date(0).toISOString()

    const supabase = createClient()
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', friendId)
      .eq('recipient_id', myId)
      .gt('created_at', since)
      .then(({ count }) => setHasUnread((count ?? 0) > 0))
  }, [myId, friendId])

  if (!hasUnread) return null
  return (
    <span className="w-2.5 h-2.5 rounded-full bg-danger shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
  )
}
