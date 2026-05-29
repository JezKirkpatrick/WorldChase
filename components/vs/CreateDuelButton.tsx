'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'open' | 'friend' | 'world'
const WAGERS = [10, 25, 50, 100]

interface Friend {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
}

function safeLabel(f: Friend) {
  return f.display_name || f.username || 'Hunter'
}

function WagerPicker({ tokens, wager, setWager }: { tokens: number; wager: number; setWager: (w: number) => void }) {
  return (
    <div>
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
        <span>Winner takes: <span className="text-gold font-bold">{wager * 2}</span></span>
      </div>
    </div>
  )
}

export default function CreateDuelButton({ tokens }: { tokens: number }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('open')
  const [wager, setWager] = useState(25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Friend mode
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)

  useEffect(() => {
    setError('')
    setSelectedFriend(null)
    if (mode !== 'friend' || friends.length > 0) return
    setLoadingFriends(true)
    fetch('/api/vs/friends-list')
      .then(r => r.json())
      .then(d => { setFriends(d.friends ?? []); setLoadingFriends(false) })
      .catch(() => setLoadingFriends(false))
  }, [mode])

  async function createOpen() {
    setLoading(true); setError('')
    const res = await fetch('/api/vs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create duel'); setLoading(false); return }
    router.push(`/vs/${data.matchId}`)
  }

  async function createFriend() {
    if (!selectedFriend) { setError('Select a friend first'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/vs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager, matchType: 'friend_invite', friendId: selectedFriend.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
    router.push(`/vs/${data.matchId}`)
  }

  async function queueWorld() {
    setLoading(true); setError('')
    const res = await fetch('/api/vs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
    router.push(`/vs/${data.matchId}`)
  }

  const tabs: { id: Mode; label: string; icon: string }[] = [
    { id: 'open',   label: 'OPEN',       icon: '🔓' },
    { id: 'friend', label: 'VS FRIEND',  icon: '👥' },
    { id: 'world',  label: 'VS WORLD',   icon: '🌍' },
  ]

  return (
    <div className="bg-navy-light border border-gold/30">
      {/* Tab strip */}
      <div className="grid grid-cols-3 border-b border-gold/20">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`py-3 font-head font-bold text-xs tracking-widest transition-all ${
              mode === t.id
                ? 'bg-gold/10 text-gold border-b-2 border-gold'
                : 'text-text-muted hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── OPEN CHALLENGE ── */}
        {mode === 'open' && (
          <>
            <p className="text-text-muted font-head text-sm mb-5">
              Post an open challenge. Any hunter can accept and you both race to name the same location first. You have <span className="text-gold font-bold">{tokens}</span> tokens.
            </p>
            <WagerPicker tokens={tokens} wager={wager} setWager={setWager} />
            {error && <div className="text-danger text-xs font-head mb-3">{error}</div>}
            <button
              onClick={createOpen}
              disabled={loading || tokens < wager}
              className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'CREATING...' : `⚔️  CREATE OPEN DUEL — WAGER ${wager}`}
            </button>
          </>
        )}

        {/* ── VS FRIEND ── */}
        {mode === 'friend' && (
          <>
            <p className="text-text-muted font-head text-sm mb-4">
              Challenge a friend directly. They'll get a notification and can accept when ready.
            </p>

            {loadingFriends ? (
              <div className="text-center py-6 text-text-muted font-head text-sm animate-pulse">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-6 bg-navy border border-white/10 mb-5">
                <div className="text-2xl mb-2 opacity-30">👥</div>
                <div className="text-text-muted font-head text-sm">No friends yet.</div>
                <a href="/friends" className="text-electric font-head text-xs mt-1 inline-block hover:text-white">Add friends →</a>
              </div>
            ) : (
              <div className="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
                {friends.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriend(selectedFriend?.id === f.id ? null : f)}
                    className={`w-full flex items-center gap-3 p-3 border transition-all text-left ${
                      selectedFriend?.id === f.id
                        ? 'border-gold bg-gold/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-xl leading-none shrink-0">{f.equipped_avatar ?? '🌍'}</span>
                    <span className="flex-1 font-head text-sm text-white truncate">{safeLabel(f)}</span>
                    {selectedFriend?.id === f.id && (
                      <span className="text-gold font-head text-xs font-bold shrink-0">✓ SELECTED</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {friends.length > 0 && (
              <>
                <WagerPicker tokens={tokens} wager={wager} setWager={setWager} />
                {error && <div className="text-danger text-xs font-head mb-3">{error}</div>}
                <button
                  onClick={createFriend}
                  disabled={loading || tokens < wager || !selectedFriend}
                  className="w-full py-3 bg-electric text-navy font-head font-bold text-sm tracking-widest hover:bg-electric/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'SENDING...' : selectedFriend ? `⚔️  CHALLENGE ${safeLabel(selectedFriend).toUpperCase()} — WAGER ${wager}` : 'SELECT A FRIEND ABOVE'}
                </button>
              </>
            )}
          </>
        )}

        {/* ── VS WORLD ── */}
        {mode === 'world' && (
          <>
            <p className="text-text-muted font-head text-sm mb-5">
              Enter the global queue and get matched with a random hunter at the same wager. Battle starts the moment an opponent is found. You have <span className="text-gold font-bold">{tokens}</span> tokens.
            </p>
            <WagerPicker tokens={tokens} wager={wager} setWager={setWager} />
            {error && <div className="text-danger text-xs font-head mb-3">{error}</div>}
            <button
              onClick={queueWorld}
              disabled={loading || tokens < wager}
              className="w-full py-3 bg-navy border-2 border-electric text-electric font-head font-bold text-sm tracking-widest hover:bg-electric hover:text-navy transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-electric rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-electric rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-electric rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : `🌍  FIND OPPONENT — WAGER ${wager}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
