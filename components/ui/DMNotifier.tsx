'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export default function DMNotifier({ myId }: { myId: string }) {
  const { toast } = useToast()
  const chName  = useRef(`wc_dmnotify_${Math.random().toString(36).slice(2)}`)
  const notified = useRef(new Set<string>())

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(chName.current)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${myId}`,
      }, async (p: any) => {
        const msgId: string = p.new.id
        if (notified.current.has(msgId)) return
        notified.current.add(msgId)

        const senderId: string = p.new.sender_id

        // Skip toast if already viewing this specific conversation
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          // Mark it read so the badge doesn't flash up either
          localStorage.setItem(`wc_dm_read_${myId}_${senderId}`, String(Date.now()))
          // If on /friends/[username] we can't easily compare sender without the username,
          // so we only skip if the pathname starts with /friends/ (any DM open)
          if (path.startsWith('/friends/') && path !== '/friends') return
        }

        const { data: sender } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', senderId)
          .maybeSingle()

        const name = sender?.display_name || sender?.username || 'A friend'
        toast(`💬 ${name} sent you a message`, 'info')
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [myId, toast])

  return null
}
