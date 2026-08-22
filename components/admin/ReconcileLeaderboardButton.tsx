'use client'
import { useState } from 'react'

export default function ReconcileLeaderboardButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<string[]>([])

  async function run() {
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/reconcile-leaderboard', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResults(
          data.fixed === 0
            ? ['No mismatches found — every leaderboard row already matches real completed rounds.']
            : data.mismatches.map((m: any) =>
                `${m.username}: was ${m.was.completed}/${m.was.score} → now ${m.now.completed}/${m.now.score}`
              )
        )
        setStatus('done')
      } else {
        setResults([data.error ?? 'Unknown error'])
        setStatus('error')
      }
    } catch {
      setResults(['Network error'])
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={run}
        disabled={status === 'loading'}
        className="px-6 py-2.5 font-head font-bold text-xs tracking-widest border transition-all disabled:opacity-50 disabled:cursor-not-allowed
          border-gold/40 text-gold hover:bg-gold/10"
      >
        {status === 'loading' ? 'CHECKING...' : status === 'done' ? 'RUN AGAIN' : 'CHECK & REPAIR LEADERBOARD'}
      </button>

      {results.length > 0 && (
        <div className={`text-xs font-head space-y-0.5 ${status === 'error' ? 'text-danger' : 'text-success'}`}>
          {results.map((r, i) => <div key={i}>→ {r}</div>)}
        </div>
      )}
    </div>
  )
}
