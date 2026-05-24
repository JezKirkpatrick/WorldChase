'use client'
import { useState } from 'react'

export default function SeedShopButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<string[]>([])

  async function seed() {
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/seed-shop', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setResults(data.results ?? [])
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
        onClick={seed}
        disabled={status === 'loading' || status === 'done'}
        className="px-6 py-2.5 font-head font-bold text-xs tracking-widest border transition-all disabled:opacity-50 disabled:cursor-not-allowed
          border-electric/40 text-electric hover:bg-electric/10"
      >
        {status === 'loading' ? 'SEEDING...' : status === 'done' ? '✓ DONE' : 'SEED SHOP CATALOGUE'}
      </button>

      {results.length > 0 && (
        <div className={`text-xs font-head space-y-0.5 ${status === 'error' ? 'text-danger' : 'text-success'}`}>
          {results.map((r, i) => <div key={i}>→ {r}</div>)}
        </div>
      )}
    </div>
  )
}
