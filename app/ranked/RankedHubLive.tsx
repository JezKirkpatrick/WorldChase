'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARENAS, ARENA_BY_LEVEL, MATCH_CAPACITY } from '@/lib/arenas'
import { safeDisplayName } from '@/lib/userDisplay'

interface ArenaProgress {
  current_arena: number
  trophies: number
  elo: number
  win_streak: number
}

interface PendingInvite {
  id: string
  arena_level: number
  format: string
  inviterName: string
  inviterAvatar: string | null
  wager: number
}

interface Friend {
  id: string
  display_name: string | null
  username: string | null
  equipped_avatar: string | null
}

interface Props {
  progress: ArenaProgress | null
  pendingInvites: PendingInvite[]
  friends: Friend[]
  tokens: number
}

export default function RankedHubLive({ progress, pendingInvites, friends, tokens }: Props) {
  const router = useRouter()
  const [format, setFormat] = useState<'1v1' | '2v2' | 'ffa5'>('1v1')
  const [queueing, setQueueing] = useState(false)
  const [queueError, setQueueError] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const currentArena = progress?.current_arena ?? 1
  const arena = ARENA_BY_LEVEL[currentArena] ?? ARENAS[0]
  const nextArena = ARENA_BY_LEVEL[currentArena + 1]
  const trophies = progress?.trophies ?? 0
  const elo = progress?.elo ?? 1000

  const progressPct = nextArena
    ? Math.min(100, Math.round(((trophies - arena.minTrophies) / (nextArena.minTrophies - arena.minTrophies)) * 100))
    : 100

  const canAfford = tokens >= arena.tokenWager
  const capacity = MATCH_CAPACITY[format]

  async function handleQueue() {
    if (!canAfford) return
    setQueueing(true)
    setQueueError('')
    const res = await fetch('/api/ranked/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    })
    const data = await res.json()
    setQueueing(false)
    if (!res.ok) { setQueueError(data.error ?? 'Failed to queue'); return }
    router.push(`/ranked/${data.matchId}`)
  }

  async function handleInvite(friendId: string) {
    setInviting(friendId)
    setInviteError('')
    const res = await fetch('/api/ranked/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitedUserId: friendId }),
    })
    const data = await res.json()
    setInviting(null)
    if (!res.ok) { setInviteError(data.error ?? 'Failed to invite'); return }
    router.push(`/ranked/${data.matchId}`)
  }

  async function handleAccept(matchId: string) {
    setAcceptingId(matchId)
    const res = await fetch('/api/ranked/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    })
    const data = await res.json()
    setAcceptingId(null)
    if (!res.ok) { alert(data.error ?? 'Failed to accept'); return }
    router.push(`/ranked/${matchId}`)
  }

  async function handleDecline(matchId: string) {
    await fetch('/api/ranked/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    })
    router.refresh()
  }

  function AvatarSpan({ av }: { av?: string | null }) {
    if (!av) return <span className="text-2xl">🌍</span>
    if (av.startsWith('http')) return <img src={av} alt="" className="w-8 h-8 rounded-full object-cover" />
    return <span className="text-2xl leading-none">{av}</span>
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Arena card */}
        <div className="bg-navy-light border p-6" style={{ borderColor: arena.color + '66' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-head tracking-[0.3em] mb-1" style={{ color: arena.color }}>
                ARENA {currentArena}
              </div>
              <h2 className="font-head font-bold text-2xl text-white flex items-center gap-2">
                {arena.emoji} {arena.name}
              </h2>
              <p className="text-text-muted font-head text-xs mt-1">{arena.description}</p>
            </div>
            <div className="text-right">
              {arena.isEloMode ? (
                <>
                  <div className="text-xs font-head text-text-muted tracking-widest">ELO</div>
                  <div className="font-head font-bold text-xl text-white">{elo}</div>
                </>
              ) : (
                <>
                  <div className="text-xs font-head text-text-muted tracking-widest">TROPHIES</div>
                  <div className="font-head font-bold text-xl text-white">{trophies} 🏆</div>
                  {(progress?.win_streak ?? 0) >= 2 && (
                    <div className="text-xs font-head text-yellow-400 mt-0.5">{progress!.win_streak}🔥 streak</div>
                  )}
                </>
              )}
            </div>
          </div>

          {nextArena && !arena.isEloMode && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-head text-text-muted">
                <span>Progress to {nextArena.emoji} {nextArena.name}</span>
                <span>{trophies} / {nextArena.minTrophies}</span>
              </div>
              <div className="h-2 bg-navy rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: arena.color }} />
              </div>
            </div>
          )}

          {arena.isEloMode && (
            <p className="text-xs font-head text-text-muted/70 mt-2">
              Hall of Champions uses global ELO ranking. K=32, every match counts.
            </p>
          )}
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-head font-bold text-xs tracking-widest text-text-muted px-0.5">
              INCOMING CHALLENGES
            </h3>
            {pendingInvites.map(invite => (
              <div key={invite.id} className="bg-navy-light border border-gold/30 p-4 flex items-center gap-4">
                <AvatarSpan av={invite.inviterAvatar} />
                <div className="flex-1 min-w-0">
                  <div className="font-head font-bold text-white text-sm truncate">
                    {invite.inviterName} is challenging you
                  </div>
                  <div className="text-text-muted font-head text-xs">
                    Arena {invite.arena_level} · {invite.format.toUpperCase()} · Wager: {invite.wager} tokens
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={acceptingId === invite.id}
                    className="px-3 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40"
                  >
                    {acceptingId === invite.id ? '...' : 'ACCEPT'}
                  </button>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    className="px-3 py-1.5 border border-danger/30 text-danger font-head text-xs hover:bg-danger/10 transition-colors"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Matchmaking */}
        <div className="bg-navy-light border border-white/10 p-6 space-y-5">
          <h3 className="font-head font-bold text-xs tracking-widest text-text-muted">ENTER ARENA</h3>

          {/* Format selector */}
          <div>
            <div className="text-xs font-head text-text-muted/60 tracking-widest mb-2">FORMAT</div>
            <div className="grid grid-cols-3 gap-2">
              {(['1v1', '2v2', 'ffa5'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2.5 font-head font-bold text-sm tracking-widest border transition-colors ${
                    format === f
                      ? 'text-navy'
                      : 'bg-navy border-white/10 text-text-muted hover:border-white/30 hover:text-white'
                  }`}
                  style={format === f ? { background: arena.color, borderColor: arena.color } : {}}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-xs font-head text-text-muted/50 mt-2 text-center">
              {capacity} players · {format === 'ffa5' ? '1st takes all' : format === '2v2' ? 'team battle' : 'first correct wins'}
            </div>
          </div>

          {/* Wager info */}
          <div className="bg-navy border border-white/5 p-4 text-center">
            <div className="text-xs font-head text-text-muted tracking-widest mb-1">ARENA WAGER</div>
            <div className="font-head font-bold text-2xl text-gold">{arena.tokenWager} 🪙</div>
            <div className="text-xs font-head text-text-muted mt-1">
              difficulty: {arena.difficulty}
            </div>
          </div>

          {queueError && <div className="text-danger text-xs font-head">{queueError}</div>}

          <button
            onClick={handleQueue}
            disabled={queueing || !canAfford}
            className="w-full py-3.5 font-head font-bold text-sm tracking-widest transition-colors disabled:opacity-40"
            style={{ background: canAfford ? arena.color : undefined,
              color: canAfford ? '#0a0f1a' : undefined,
              ...(canAfford ? {} : { border: '1px solid rgba(255,255,255,0.1)', color: '#666' }),
            }}
          >
            {queueing ? 'FINDING MATCH...' :
             !canAfford ? `NOT ENOUGH TOKENS (need ${arena.tokenWager})` :
             'ENTER ARENA'}
          </button>
        </div>

        {/* Invite a friend */}
        {friends.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-head font-bold text-xs tracking-widest text-text-muted px-0.5">
              INVITE A PLAYER TO BATTLE
            </h3>
            {inviteError && <div className="text-danger text-xs font-head px-0.5">{inviteError}</div>}
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.id} className="bg-navy-light border border-white/8 p-4 flex items-center gap-3 hover:border-white/20 transition-colors">
                  <AvatarSpan av={friend.equipped_avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-bold text-white text-sm truncate">
                      {safeDisplayName(friend) ?? friend.username ?? 'Hunter'}
                    </div>
                    <div className="text-text-muted font-head text-xs">
                      @{friend.username ?? '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(friend.id)}
                    disabled={inviting === friend.id || queueing || !canAfford}
                    className="px-4 py-2 border font-head font-bold text-xs tracking-widest transition-colors disabled:opacity-40 shrink-0"
                    style={{
                      borderColor: arena.color + '66',
                      color: arena.color,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = arena.color + '22')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {inviting === friend.id ? '...' : 'CHALLENGE'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {friends.length === 0 && (
          <div className="text-center py-6 text-text-muted/50 font-head text-sm">
            <div className="text-3xl mb-2">👥</div>
            <div>Add friends to challenge them directly</div>
            <a href="/friends" className="block mt-2 text-xs font-head"
              style={{ color: arena.color }}>
              Find Friends →
            </a>
          </div>
        )}

      </div>
    </div>
  )
}
