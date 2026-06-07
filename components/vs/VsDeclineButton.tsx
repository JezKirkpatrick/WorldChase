'use client'
import { useState } from 'react'

export default function VsDeclineButton({ matchId }: { matchId: string }) {
  const [declining, setDeclining] = useState(false)
  const [err, setErr] = useState('')

  async function decline() {
    if (declining) return
    setDeclining(true)
    setErr('')
    try {
      const res = await fetch('/api/vs/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? `Error ${res.status}`)
        setDeclining(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      setErr(e?.message ?? 'Network error')
      setDeclining(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={decline}
        disabled={declining}
        className="shrink-0 px-3 py-4 border border-white/20 text-text-muted font-head text-xs hover:border-danger/40 hover:text-danger transition-colors disabled:opacity-40"
        title="Decline challenge"
      >
        {declining ? '...' : '✕'}
      </button>
      {err && <span className="text-danger font-head text-[10px] text-center max-w-[60px] leading-tight">{err}</span>}
    </div>
  )
}
