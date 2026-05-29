'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const WAGERS = [10, 25, 50, 100]

export default function CreateDuelButton({ tokens }: { tokens: number }) {
  const router = useRouter()
  const [wager, setWager] = useState(25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/vs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create duel'); setLoading(false); return }
    router.push(`/vs/${data.matchId}`)
  }

  return (
    <div className="bg-navy-light border border-gold/30 p-6">
      <div className="text-xs font-head text-gold tracking-widest mb-4">CREATE A DUEL</div>
      <p className="text-text-muted font-head text-sm mb-5">
        Pick a wager. You and your opponent each put tokens in. First hunter to name the correct location takes the full pot.
        You have <span className="text-gold font-bold">{tokens}</span> tokens.
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {WAGERS.map(w => (
          <button
            key={w}
            onClick={() => setWager(w)}
            disabled={tokens < w}
            className={`py-2.5 font-head font-bold text-sm tracking-widest border transition-all ${
              wager === w
                ? 'bg-gold text-navy border-gold'
                : tokens < w
                  ? 'border-white/10 text-white/20 cursor-not-allowed'
                  : 'border-white/20 text-text-muted hover:border-gold/50 hover:text-white'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-xs font-head text-text-muted mb-5">
        <span>Your stake: <span className="text-gold font-bold">{wager}</span> tokens</span>
        <span>Winner takes: <span className="text-gold font-bold">{wager * 2}</span> tokens</span>
      </div>

      {error && <div className="text-danger text-xs font-head mb-3">{error}</div>}

      <button
        onClick={create}
        disabled={loading || tokens < wager}
        className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'CREATING...' : `⚔️  CREATE DUEL — WAGER ${wager} TOKENS`}
      </button>
    </div>
  )
}
