'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function UnreadDMsBadge({ myId }: { myId: string }) {
  const [count, setCount] = useState(0)
  const chName = useRef(`wc_dm_nav_badge_${Math.random().toString(36).slice(2)}`)

  async function refresh() {
    const supabase = createClient()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabase
      .from('direct_messages')
      .select('id, sender_id, created_at')
      .eq('recipient_id', myId)
      .gte('created_at', since30d)

    if (!data) return

    const senders = [...new Set(data.map(m => m.sender_id))]
    let unread = 0
    for (const senderId of senders) {
      const lastRead = localStorage.getItem(`wc_dm_read_${myId}_${senderId}`)
      const since = lastRead ? parseInt(lastRead) : 0
      if (data.some(m => m.sender_id === senderId && new Date(m.created_at).getTime() > since)) {
        unread++
      }
    }
    setCount(unread)
  }

  useEffect(() => {
    refresh()
    const supabase = createClient()
    const ch = supabase.channel(chName.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (p: any) => {
        if (p.new.recipient_id === myId) refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId])

  if (count === 0) return null
  return (
    <span className="absolute -top-1.5 -right-3 bg-danger text-white font-mono text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5">
      {count > 9 ? '9+' : count}
    </span>
  )
}
