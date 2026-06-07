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

      // Someone sent me a direct friend challenge — hard-navigate to VS page so fresh server data loads
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'vs_matches',
        filter: `invited_friend_id=eq.${myId}`,
      }, (p: any) => {
        const matchId: string = p.new.id
        if (notified.current.has(matchId)) return
        notified.current.add(matchId)
        toast(`⚔️ You've been challenged! ${p.new.wager} tokens — accept below`, 'info')
        // Hard navigation bypasses Next.js router cache so the VS page always shows fresh invites
        window.location.href = '/vs'
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
          ? '⚔️ Opponent found! Entering battle...'
          : '⚔️ Duel accepted! Battle is live!'
        toast(msg, 'info')
        // Navigate challenger straight to the battle
        router.push(`/vs/${matchId}`)
      })

      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [myId, toast, router])

  return null
}
