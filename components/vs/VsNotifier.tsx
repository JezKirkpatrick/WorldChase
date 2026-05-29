'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export default function VsNotifier({ myId }: { myId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const chName = useRef(`wc_vsnotify_${Math.random().toString(36).slice(2)}`)
  const notified = useRef(new Set<string>())

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(chName.current)

      // Someone sent me a direct friend challenge
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'vs_matches',
        filter: `invited_friend_id=eq.${myId}`,
      }, (p: any) => {
        const matchId: string = p.new.id
        if (notified.current.has(matchId)) return
        notified.current.add(matchId)
        toast(`⚔️ You've been challenged! Wager: ${p.new.wager} tokens — tap VS DUEL`, 'info')
        router.refresh()
      })

      // My pending match became active (someone accepted or queue matched)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vs_matches',
        filter: `challenger_id=eq.${myId}`,
      }, (p: any) => {
        if (p.new.status !== 'active') return
        const matchId: string = p.new.id
        if (notified.current.has(`active_${matchId}`)) return
        notified.current.add(`active_${matchId}`)
        const msg = p.new.match_type === 'queue'
          ? '⚔️ Opponent found! Head to VS DUEL to battle!'
          : '⚔️ Your duel was accepted! Battle is live!'
        toast(msg, 'info')
        router.refresh()
      })

      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [myId, toast, router])

  return null
}
