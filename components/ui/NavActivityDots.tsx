'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const DOT = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-danger shadow-[0_0_5px_rgba(239,68,68,0.7)]'

// ── Play dot — active event with incomplete challenges ────────────────
export function PlayDot({ userId }: { userId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function check() {
      const { data: event } = await supabase
        .from('monthly_events').select('id').eq('status', 'active').maybeSingle()
      if (!event) return

      const [{ count: done }, { count: total }] = await Promise.all([
        supabase.from('player_progress').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('event_id', event.id).in('status', ['completed', 'skipped']),
        supabase.from('challenges').select('id', { count: 'exact', head: true })
          .eq('event_id', event.id),
      ])
      setShow((done ?? 0) < (total ?? 0))
    }
    check()
  }, [userId])

  return show ? <span className={DOT} /> : null
}

// ── VS dot — pending/active duels or incoming friend challenges ──────
export function VsDot({ userId }: { userId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const now = new Date().toISOString()
    Promise.all([
      // My own active/pending duels
      supabase.from('vs_matches').select('id', { count: 'exact', head: true })
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['pending', 'active']),
      // Friend challenges sent to me
      supabase.from('vs_matches').select('id', { count: 'exact', head: true })
        .eq('invited_friend_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', now),
    ]).then(([mine, invites]) => {
      setShow(((mine.count ?? 0) + (invites.count ?? 0)) > 0)
    })
  }, [userId])

  return show ? <span className={DOT} /> : null
}

// ── Chat dot — new messages since last visit ──────────────────────────
export function ChatDot({ userId }: { userId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const lastVisit = localStorage.getItem('wc_chat_last_visit')
    const since = lastVisit
      ? new Date(parseInt(lastVisit)).toISOString()
      : new Date(Date.now() - 60 * 60 * 1000).toISOString() // default: last hour

    const supabase = createClient()
    supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .gt('created_at', since)
      .neq('user_id', userId)
      .then(({ count }) => setShow((count ?? 0) > 0))
  }, [userId])

  return show ? <span className={DOT} /> : null
}
