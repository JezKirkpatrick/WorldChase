'use client'
import { useState } from 'react'

export default function FixAvatarsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<string[]>([])

  async function fix() {
    if (!confirm('This will replace ALL avatar cosmetics with the new clean set and reset any equipped duplicates to the Globe. Continue?')) return
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/fix-avatars', { method: 'POST' })
      const data = await res.json()
      setResults(data.results ?? [data.error ?? 'Unknown error'])
      setStatus(data.ok ? 'done' : 'error')
    } catch {
      setResults(['Network error'])
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={fix}
        disabled={status === 'loading' || status === 'done'}
        className="px-6 py-2.5 font-head font-bold text-xs tracking-widest border transition-all disabled:opacity-50 disabled:cursor-not-allowed
          border-danger/40 text-danger hover:bg-danger/10"
      >
        {status === 'loading' ? 'FIXING...' : status === 'done' ? '✓ DONE' : 'FIX AVATARS (REMOVE DUPLICATES)'}
      </button>

      {results.length > 0 && (
        <div className={`text-xs font-head space-y-0.5 ${status === 'error' ? 'text-danger' : 'text-success'}`}>
          {results.map((r, i) => <div key={i}>→ {r}</div>)}
        </div>
      )}
    </div>
  )
}
