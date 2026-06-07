'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

const DOT = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-danger shadow-[0_0_5px_rgba(239,68,68,0.7)]'
const DOT_INLINE = 'inline-block w-2 h-2 rounded-full bg-danger shadow-[0_0_5px_rgba(239,68,68,0.7)] shrink-0'

// ── Play dot — active event with incomplete challenges ────────────────
export function PlayDot({ userId, inline }: { userId: string; inline?: boolean }) {
  const [show, setShow] = useState(false)
  const instanceId = useRef(`${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const supabase = createClient()

    async function check() {
      const { data: event } = await supabase
        .from('monthly_events').select('id').eq('status', 'active').maybeSingle()
      if (!event) { setShow(false); return }

      const [{ count: done }, { count: total }] = await Promise.all([
        supabase.from('player_progress').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('event_id', event.id).in('status', ['completed', 'skipped']),
        supabase.from('challenges').select('id', { count: 'exact', head: true })
          .eq('event_id', event.id),
      ])
      setShow((done ?? 0) < (total ?? 0))
    }

    check()

    // Re-check whenever this user's progress rows change
    const ch = supabase.channel(`wc_playdot_${userId}_${instanceId.current}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'player_progress',
        filter: `user_id=eq.${userId}`,
      }, () => { check() })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return show ? <span className={inline ? DOT_INLINE : DOT} /> : null
}

// ── VS dot — pending/active duels or incoming friend challenges ──────
export function VsDot({ userId, inline }: { userId: string; inline?: boolean }) {
  const [show, setShow] = useState(false)
  const instanceId = useRef(`${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const supabase = createClient()

    async function check() {
      const now = new Date().toISOString()

      const myDuels = supabase.from('vs_matches').select('id', { count: 'exact', head: true })
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['pending', 'active'])

      const friendInvites = supabase.from('vs_matches').select('id', { count: 'exact', head: true })
        .eq('invited_friend_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', now)

      const [mine, invites] = await Promise.allSettled([myDuels, friendInvites])
      const mineCount = mine.status === 'fulfilled' ? (mine.value.count ?? 0) : 0
      const inviteCount = invites.status === 'fulfilled' ? (invites.value.count ?? 0) : 0
      setShow((mineCount + inviteCount) > 0)
    }

    check()

    // Re-check whenever any vs_match involving this user changes
    const ch = supabase.channel(`wc_vsdot_${userId}_${instanceId.current}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vs_matches',
      }, () => { check() })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return show ? <span className={inline ? DOT_INLINE : DOT} /> : null
}

// ── Chat dot — new messages since last visit, updates in real-time ────
export function ChatDot({ userId, inline }: { userId: string; inline?: boolean }) {
  const [show, setShow] = useState(false)
  const instanceId = useRef(`${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const lastVisit = localStorage.getItem('wc_chat_last_visit')
    const lastVisitNum = lastVisit ? parseInt(lastVisit, 10) : NaN
    const since = !isNaN(lastVisitNum)
      ? new Date(lastVisitNum).toISOString()
      : new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const supabase = createClient()

    supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .gt('created_at', since)
      .neq('user_id', userId)
      .then(({ count }) => { if ((count ?? 0) > 0) setShow(true) })

    const ch = supabase.channel(`wc_chatdot_${userId}_${instanceId.current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p: any) => {
        if (p.new.user_id !== userId) setShow(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return show ? <span className={inline ? DOT_INLINE : DOT} /> : null
}
