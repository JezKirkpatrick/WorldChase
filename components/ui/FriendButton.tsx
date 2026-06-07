'use client'
import { useState } from 'react'
import Link from 'next/link'

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function FriendButton({
  targetUserId,
  targetUsername,
  initialStatus,
}: {
  targetUserId: string
  targetUsername: string
  initialStatus: FriendStatus
}) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  async function sendRequest() {
    setLoading(true)
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    if (res.ok) setStatus('pending_sent')
    setLoading(false)
  }

  async function respond(accept: boolean) {
    setLoading(true)
    const res = await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: targetUserId, accept }),
    })
    if (res.ok) setStatus(accept ? 'accepted' : 'none')
    setLoading(false)
  }

  async function unfriend() {
    setLoading(true)
    const res = await fetch('/api/friends/unfriend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    if (res.ok) setStatus('none')
    setLoading(false)
  }

  if (status === 'none') return (
    <button onClick={sendRequest} disabled={loading}
      className="shrink-0 px-3 py-2 border border-electric/40 text-electric font-head text-xs font-bold tracking-widest hover:bg-electric/10 transition-all disabled:opacity-50">
      {loading ? '···' : '👥 ADD FRIEND'}
    </button>
  )

  if (status === 'pending_sent') return (
    <button onClick={unfriend} disabled={loading} title="Cancel request"
      className="shrink-0 px-3 py-2 border border-white/20 text-text-muted font-head text-xs font-bold tracking-widest hover:border-danger/40 hover:text-danger transition-all disabled:opacity-50">
      {loading ? '···' : '⏳ PENDING'}
    </button>
  )

  if (status === 'pending_received') return (
    <div className="flex gap-2 shrink-0">
      <button onClick={() => respond(true)} disabled={loading}
        className="px-4 py-3 bg-electric/10 border border-electric/50 text-electric font-head text-xs font-bold tracking-widest hover:bg-electric/20 transition-all disabled:opacity-50">
        {loading ? '···' : '✓ ACCEPT'}
      </button>
      <button onClick={() => respond(false)} disabled={loading}
        className="px-3 py-3 border border-white/20 text-text-muted font-head text-xs font-bold hover:border-danger/40 hover:text-danger transition-all disabled:opacity-50">
        ✕
      </button>
    </div>
  )

  // accepted
  return (
    <Link href={`/friends/${targetUsername}`}
      className="shrink-0 px-3 py-2 border border-electric/40 text-electric font-head text-xs font-bold tracking-widest hover:bg-electric/10 transition-all">
      💬 MESSAGE
    </Link>
  )
}
