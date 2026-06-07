'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Silently refreshes the VS page whenever a match is created or updated that involves this user.
// This ensures friend invites appear immediately without requiring a manual page reload.
export default function VsPageLive({ userId }: { userId: string }) {
  const router = useRouter()
  const instanceId = useRef(`${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const supabase = createClient()

    const ch = supabase.channel(`wc_vs_page_${userId}_${instanceId.current}`)
      // New invite directed at me — hard reload so fresh server data always shows
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'vs_matches',
        filter: `invited_friend_id=eq.${userId}`,
      }, () => { window.location.reload() })
      // Any match where I'm challenger changes status (accepted, cancelled, etc.)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'vs_matches',
        filter: `challenger_id=eq.${userId}`,
      }, () => { router.refresh() })
      // Any match where I'm opponent changes (shouldn't happen often but handles edge cases)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'vs_matches',
        filter: `opponent_id=eq.${userId}`,
      }, () => { router.refresh() })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, router])

  return null
}
