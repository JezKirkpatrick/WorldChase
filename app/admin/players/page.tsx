'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types/user'

export default function AdminPlayersPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [grantAmount, setGrantAmount] = useState('')
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    setLoading(true)
    let dbQuery = supabase.from('profiles').select('*', { count: 'exact' })
      .eq('is_fake', false)
      .order('created_at', { ascending: false })
      .limit(200)
    if (q.trim()) dbQuery = dbQuery.ilike('username', `%${q.trim()}%`)
    const { data, count } = await dbQuery
    setResults(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase])

  // Load every real player up front — the page used to start empty and require
  // typing something first, which made it look like most players didn't exist.
  useEffect(() => { search('') }, [search])

  async function grantTokens() {
    if (!selected) return
    const amount = parseInt(grantAmount)
    if (!amount) return
    const res = await fetch('/api/admin/players/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selected.id, amount }),
    })
    if (res.ok) {
      setSelected(p => p ? { ...p, tokens: p.tokens + amount } : null)
      setGrantAmount('')
    }
  }

  async function toggleBan(player: Profile) {
    const newBan = !player.is_banned
    const res = await fetch('/api/admin/players/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: player.id, ban: newBan }),
    })
    if (res.ok) {
      setResults(prev => prev.map(p => p.id === player.id ? { ...p, is_banned: newBan } : p))
      if (selected?.id === player.id) setSelected(p => p ? { ...p, is_banned: newBan } : null)
    }
  }

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center gap-4 px-6">
        <Link href="/admin" className="text-text-muted font-head text-sm">← ADMIN</Link>
        <span className="font-head font-bold text-gold tracking-widest">PLAYERS</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-head font-bold text-2xl text-white">MANAGE PLAYERS</h1>
          <span className="text-text-muted font-head text-sm">{total} real player{total === 1 ? '' : 's'}</span>
        </div>

        <div className="flex gap-3 mb-6">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search(query)}
            placeholder="Search by username..."
            className="flex-1 bg-navy-light border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60" />
          <button onClick={() => search(query)} disabled={loading} className="px-6 py-3 bg-gold text-navy font-head font-bold text-sm tracking-wider hover:bg-gold-dim disabled:opacity-50">
            SEARCH
          </button>
        </div>

        <div className="space-y-2">
          {results.map(player => (
            <div key={player.id} onClick={() => setSelected(player)}
              className={`flex items-center justify-between border px-4 py-3 cursor-pointer transition-all ${selected?.id === player.id ? 'border-gold/40' : 'border-white/10 hover:border-white/20'}`}>
              <div>
                <div className="font-head font-bold text-white">{player.username}</div>
                <div className="text-text-muted font-head text-xs">{player.country ?? '—'}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-gold text-sm">🪙 {player.tokens}</div>
                {player.is_banned && <div className="text-danger text-xs font-head">BANNED</div>}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="mt-8 bg-navy-light border border-gold/30 p-6 space-y-4">
            <h2 className="font-head font-bold text-gold tracking-wider">{selected.username}</h2>
            <div className="text-text-muted font-head text-sm">Tokens: <span className="text-gold font-bold">{selected.tokens}</span> · Score: {selected.total_score_alltime.toLocaleString()}</div>
            <div className="flex gap-3">
              <input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)}
                placeholder="Token amount (neg to remove)"
                className="flex-1 bg-navy border border-white/20 px-3 py-2 text-white font-head text-sm outline-none focus:border-gold/60" />
              <button onClick={grantTokens} className="px-4 py-2 bg-gold text-navy font-head font-bold text-xs tracking-wider hover:bg-gold-dim">GRANT</button>
            </div>
            <button onClick={() => toggleBan(selected)} className={`text-sm font-head font-bold ${selected.is_banned ? 'text-success' : 'text-danger'} hover:opacity-80`}>
              {selected.is_banned ? 'UNBAN PLAYER' : 'BAN PLAYER'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
