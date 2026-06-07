'use client'
import { useState } from 'react'

export default function VsCancelButton({ matchId }: { matchId: string }) {
  const [cancelling, setCancelling] = useState(false)
  const [err, setErr] = useState('')

  async function cancel() {
    if (cancelling) return
    setCancelling(true)
    setErr('')
    try {
      const res = await fetch('/api/vs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? `Error ${res.status}`)
        setCancelling(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      setErr(e?.message ?? 'Network error')
      setCancelling(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={cancel}
        disabled={cancelling}
        className="shrink-0 px-3 py-4 border border-danger/30 text-danger font-head text-xs hover:bg-danger/10 transition-colors disabled:opacity-40"
        title="Cancel duel"
      >
        {cancelling ? '...' : '✕'}
      </button>
      {err && <span className="text-danger font-head text-[10px] text-center max-w-[60px] leading-tight">{err}</span>}
    </div>
  )
}
