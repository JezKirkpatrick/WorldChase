'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ARENA_BY_LEVEL, DIFFICULTY_CONFIG, getArenaChallengeDifficulty } from '@/lib/arenas'
import { safeDisplayName } from '@/lib/userDisplay'

interface RankedMatch {
  id: string
  format: '1v1' | '2v2' | 'ffa5'
  arena_level: number
  status: 'waiting' | 'active' | 'completed' | 'cancelled'
  challenge_id: string
  invited_user_id: string | null
  started_at: string | null
}

interface RankedPlayer {
  user_id: string
  score: number | null
  result: 'win' | 'loss' | 'refund' | null
  trophy_change: number | null
  token_change: number | null
  submitted_at: string | null
  team: number | null
  profiles?: {
    display_name: string | null
    username: string | null
    equipped_avatar: string | null
    equipped_border: string | null
  }
}

interface SafeChallenge {
  riddle_text: string
  clues: { order: number; text: string }[]
  difficulty: string
  location_country: string
}

interface RevealData {
  location_name: string
  location_country: string
  fun_fact: string
}

interface Props {
  match: RankedMatch
  players: RankedPlayer[]
  challenge: SafeChallenge | null
  currentUserId: string
  inviterName?: string | null
}

export default function RankedBattle({
  match: initialMatch,
  players: initialPlayers,
  challenge,
  currentUserId,
  inviterName,
}: Props) {
  const router = useRouter()
  const [match, setMatch] = useState(initialMatch)
  const [players, setPlayers] = useState(initialPlayers)
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackOk, setFeedbackOk] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [reveal, setReveal] = useState<RevealData | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [tabBlurred, setTabBlurred] = useState(false)
  const answerRef = useRef<HTMLInputElement>(null)
  const completedRef = useRef(false)

  const arena = ARENA_BY_LEVEL[match.arena_level] ?? ARENA_BY_LEVEL[1]
  const diffKey = getArenaChallengeDifficulty(match.arena_level)
  const timeLimit = DIFFICULTY_CONFIG[diffKey].timeLimit

  const myPlayer = players.find(p => p.user_id === currentUserId)
  const otherPlayers = players.filter(p => p.user_id !== currentUserId)
  const hasSubmitted = !!myPlayer?.submitted_at
  const allSubmitted = players.length > 0 && players.every(p => p.submitted_at)

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Countdown timer
  useEffect(() => {
    if (match.status !== 'active' || !match.started_at) return
    const start = new Date(match.started_at).getTime()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [match.status, match.started_at, timeLimit])

  // Auto-complete when timer hits 0 or all players submit
  const triggerComplete = useCallback(async () => {
    if (completedRef.current) return
    completedRef.current = true
    setCompleting(true)
    try {
      await fetch('/api/ranked/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id }),
      })
    } catch {}
  }, [match.id])

  useEffect(() => {
    if (match.status !== 'active') return
    if (timeLeft === 0) triggerComplete()
  }, [timeLeft, match.status, triggerComplete])

  useEffect(() => {
    if (match.status !== 'active') return
    if (allSubmitted && players.length >= 2) triggerComplete()
  }, [allSubmitted, players.length, match.status, triggerComplete])

  // Fetch reveal when completed
  useEffect(() => {
    if (match.status !== 'completed' || reveal) return
    fetch(`/api/ranked/reveal/${match.id}`)
      .then(r => r.json())
      .then(d => { if (d.challenge) setReveal(d.challenge) })
      .catch(() => {})
  }, [match.status, match.id, reveal])

  // Focus input when active (desktop only)
  useEffect(() => {
    if (match.status !== 'active' || hasSubmitted) return
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return
    const t = setTimeout(() => answerRef.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [match.status, hasSubmitted])

  // Tab blur anti-cheat
  useEffect(() => {
    if (match.status !== 'active') return
    const onBlur = () => setTabBlurred(true)
    const onFocus = () => setTabBlurred(false)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [match.status])

  // Realtime — watch match status + player submissions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`ranked:${match.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ranked_matches',
        filter: `id=eq.${match.id}`,
      }, payload => {
        const updated = payload.new as RankedMatch
        setMatch(updated)
        if (updated.status === 'active' && initialMatch.status === 'waiting') {
          router.refresh()
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ranked_match_players',
        filter: `match_id=eq.${match.id}`,
      }, () => {
        // Refresh player data when anything changes
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [match.id, initialMatch.status, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!guess.trim() || submitting || hasSubmitted) return
    setSubmitting(true)
    setFeedback(null)
    const res = await fetch('/api/ranked/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, guess: guess.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    setFeedbackOk(!!data.correct)
    setFeedback(data.message ?? (data.error || 'Error'))
    if (data.correct) {
      setGuess('')
      if (data.allSubmitted) triggerComplete()
    }
  }

  async function handleCancelQueue() {
    setCancelling(true)
    await fetch('/api/ranked/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    })
    router.push('/ranked')
  }

  function AvatarSpan({ av, size = 'text-2xl' }: { av?: string | null; size?: string }) {
    if (!av) return <span className={size}>🌍</span>
    if (av.startsWith('http')) return <img src={av} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
    return <span className={`leading-none ${size}`}>{av}</span>
  }

  const clues = challenge ? [...challenge.clues].sort((a, b) => a.order - b.order) : []
  const elapsed = match.started_at ? Math.floor((Date.now() - new Date(match.started_at).getTime()) / 1000) : 0
  const revealedCount = Math.min(clues.length, 1 + Math.floor(elapsed / 30))

  // ── WAITING ───────────────────────────────────────────────────────────────
  if (match.status === 'waiting') {
    const isInviteMatch = !!match.invited_user_id

    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-xs font-head tracking-[0.3em] mb-3" style={{ color: arena.color }}>
            {arena.emoji} {arena.name.toUpperCase()}
          </div>
          <h1 className="font-head font-bold text-2xl text-white mb-2">
            {isInviteMatch ? 'CHALLENGE SENT' : 'IN THE QUEUE'}
          </h1>
          <p className="text-text-muted font-head text-sm mb-10">
            {isInviteMatch
              ? `Waiting for ${inviterName ?? 'your opponent'} to accept`
              : `Searching for ${match.format.toUpperCase()} opponents in Arena ${match.arena_level}`}
            <br />
            <span className="text-gold font-bold">Wager: {arena.tokenWager} tokens</span>
          </p>

          <div className="relative w-24 h-24 mx-auto mb-10">
            <div className="absolute inset-0 rounded-full border animate-ping" style={{ borderColor: arena.color + '33', animationDuration: '2s' }} />
            <div className="absolute inset-3 rounded-full border animate-ping" style={{ borderColor: arena.color + '55', animationDuration: '2s', animationDelay: '0.4s' }} />
            <div className="absolute inset-6 rounded-full border animate-ping" style={{ borderColor: arena.color + '88', animationDuration: '2s', animationDelay: '0.8s' }} />
            <div className="absolute inset-9 rounded-full flex items-center justify-center text-xl"
              style={{ background: arena.color + '22', border: `1px solid ${arena.color}` }}>
              {arena.emoji}
            </div>
          </div>

          <button
            onClick={handleCancelQueue}
            disabled={cancelling}
            className="w-full py-2.5 border border-danger/30 text-danger font-head text-xs tracking-widest hover:bg-danger/10 transition-colors disabled:opacity-40"
          >
            {cancelling ? 'LEAVING...' : 'LEAVE QUEUE'}
          </button>
          <a href="/ranked" className="block mt-4 text-text-muted font-head text-sm hover:text-white transition-colors">
            ← Arena Hub
          </a>
        </div>
      </div>
    )
  }

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (match.status === 'completed') {
    const me = players.find(p => p.user_id === currentUserId)
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">
              {me?.result === 'win' ? '🏆' : me?.result === 'refund' ? '🤝' : '💀'}
            </div>
            <h1 className="font-head font-bold text-3xl text-white">
              {me?.result === 'win' ? 'VICTORY!' : me?.result === 'refund' ? 'TIE GAME' : 'DEFEATED'}
            </h1>
            <div className="mt-2 text-xs font-head tracking-[0.3em]" style={{ color: arena.color }}>
              {arena.emoji} {arena.name.toUpperCase()} · {match.format.toUpperCase()}
            </div>
          </div>

          {/* Player results */}
          <div className="space-y-2 mb-6">
            {sorted.map((p, i) => {
              const isMe = p.user_id === currentUserId
              const pName = isMe
                ? 'You'
                : safeDisplayName(p.profiles as any) ?? 'Hunter'
              return (
                <div key={p.user_id}
                  className={`flex items-center gap-3 p-4 border ${
                    isMe
                      ? 'bg-navy-light border-gold/30'
                      : 'bg-navy border-white/10'
                  }`}>
                  <div className="font-head font-bold text-lg w-6 text-center" style={{ color: i === 0 ? '#f5c518' : '#888' }}>
                    {i + 1}
                  </div>
                  <AvatarSpan av={p.profiles?.equipped_avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-bold text-white text-sm truncate">{pName}</div>
                    <div className="text-text-muted font-head text-xs">
                      Score: {p.score ?? 0}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-head font-bold text-sm"
                      style={{ color: (p.trophy_change ?? 0) >= 0 ? '#00ffaa' : '#ff4444' }}>
                      {(p.trophy_change ?? 0) >= 0 ? '+' : ''}{p.trophy_change ?? 0} 🏆
                    </div>
                    <div className="font-head text-xs"
                      style={{ color: (p.token_change ?? 0) >= 0 ? '#f5c518' : '#ff6b6b' }}>
                      {(p.token_change ?? 0) >= 0 ? '+' : ''}{p.token_change ?? 0} 🪙
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {reveal && (
            <div className="bg-navy-light border border-gold/20 p-5 mb-6">
              <div className="text-xs font-head text-gold tracking-widest mb-2">THE ANSWER WAS</div>
              <div className="text-white font-head font-bold text-xl mb-1">{reveal.location_name}</div>
              <div className="text-text-muted font-head text-xs mb-3">{reveal.location_country}</div>
              {reveal.fun_fact && (
                <p className="text-text-muted font-head text-xs leading-relaxed border-t border-white/10 pt-3">
                  {reveal.fun_fact}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <a href="/ranked" className="flex-1 py-3 border border-white/20 text-text-muted font-head text-sm text-center hover:text-white transition-colors">
              ← ARENA HUB
            </a>
            <a href="/play" className="flex-1 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest text-center hover:bg-gold-dim transition-colors">
              PLAY MAIN
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  if (match.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="font-head font-bold text-2xl text-white mb-2">MATCH CANCELLED</h1>
        <p className="text-text-muted font-head text-sm mb-6">The match was cancelled before it started.</p>
        <a href="/ranked" className="px-6 py-3 border border-white/20 text-text-muted font-head text-sm hover:text-white transition-colors">
          ← Arena Hub
        </a>
      </div>
    )
  }

  // ── ACTIVE BATTLE ─────────────────────────────────────────────────────────
  const danger = timeLeft !== null && timeLeft <= 10
  const warning = timeLeft !== null && timeLeft <= 30 && timeLeft > 10

  return (
    <div className="relative h-dvh bg-navy flex flex-col overflow-hidden">

      {/* Tab-blur overlay */}
      {tabBlurred && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-navy/95 backdrop-blur-sm">
          <div className="text-5xl mb-4">{arena.emoji}</div>
          <div className="font-head font-bold text-2xl tracking-widest mb-2" style={{ color: arena.color }}>
            ARENA BATTLE
          </div>
          <div className="text-text-muted font-head text-sm">Tap to return</div>
        </div>
      )}

      {/* HUD */}
      <header className="shrink-0 h-12 bg-navy-light/95 backdrop-blur border-b flex items-center px-3 gap-2"
        style={{ borderColor: arena.color + '44' }}>
        <a href="/ranked" className="font-head font-bold text-xs tracking-widest hover:opacity-70 shrink-0"
          style={{ color: arena.color }}>
          ← {arena.emoji}
        </a>
        <div className="w-px h-6 bg-white/10" />

        {/* Players row */}
        <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden">
          {players.map(p => {
            const isMe = p.user_id === currentUserId
            const av = p.profiles?.equipped_avatar ?? '🌍'
            return (
              <div key={p.user_id} className="flex items-center gap-1 shrink-0">
                <span className="text-sm leading-none">{av.startsWith('http') ? '🌍' : av}</span>
                <span className="font-head text-xs text-white font-bold">{isMe ? 'YOU' : ''}</span>
                {p.submitted_at && <span className="text-green-400 text-xs">✓</span>}
              </div>
            )
          })}
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Countdown */}
        <div className={`font-mono font-bold text-sm shrink-0 ${
          danger ? 'text-red-400 animate-pulse' : warning ? 'text-yellow-400' : 'text-gold'
        }`}>
          {completing ? '⏳' : timeLeft !== null ? `⏱ ${fmt(timeLeft)}` : ''}
        </div>

        <div className="w-px h-6 bg-white/10" />
        <div className="font-mono text-xs text-gold shrink-0">🪙{arena.tokenWager}</div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Status banners */}
          {completing && !hasSubmitted && (
            <div className="bg-danger/10 border border-danger/40 px-4 py-3 font-head text-sm text-danger animate-pulse">
              ⏰ Time's up! Finalising results…
            </div>
          )}
          {otherPlayers.some(p => p.submitted_at) && !hasSubmitted && (
            <div className="bg-danger/10 border border-danger/40 px-4 py-3 font-head text-sm text-danger animate-pulse">
              ⚡ Opponent submitted — answer NOW!
            </div>
          )}
          {hasSubmitted && !allSubmitted && (
            <div className="bg-green-900/20 border border-green-500/40 px-4 py-3 font-head text-sm text-green-400">
              ✓ Locked in! Waiting for other players…
            </div>
          )}
          {feedback && (
            <div className={`px-4 py-3 font-head text-sm border ${
              feedbackOk
                ? 'bg-green-900/20 border-green-500/30 text-green-400'
                : 'bg-white/5 border-white/10 text-text-muted'
            }`}>
              {feedback}
            </div>
          )}

          {/* Riddle */}
          <div className="bg-navy-light border p-5 select-none"
            style={{ borderColor: arena.color + '44' }}
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}>
            <div className="text-xs font-head font-bold tracking-widest mb-3 flex items-center gap-2"
              style={{ color: arena.color }}>
              MISSION BRIEFING
              <div className="flex-1 h-px" style={{ background: arena.color + '33' }} />
              <span className="text-text-muted normal-case font-normal">{diffKey}</span>
            </div>
            <p className="text-text font-head text-base leading-relaxed"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              {challenge?.riddle_text ?? ''}
            </p>
          </div>

          {/* Intel clues */}
          <div className="space-y-2 select-none"
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}>
            <div className="flex items-center justify-between text-[10px] font-head text-text-muted/50 tracking-widest px-0.5 mb-1">
              <span>INTEL FILES</span>
              <span>New file every 30s</span>
            </div>
            {clues.map((clue, i) => {
              const revealed = i < revealedCount
              const secsUntil = revealed ? 0 : (i * 30) - elapsed
              return revealed ? (
                <div key={i} className="bg-navy-light border border-white/10 p-4"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                  <div className="text-xs font-mono text-text-muted tracking-wider mb-1">
                    INTEL FILE {i + 1}
                    {i === 0 && <span className="ml-2 text-green-400">— DECLASSIFIED</span>}
                  </div>
                  <p className="text-text font-head text-sm leading-relaxed">{clue.text}</p>
                </div>
              ) : (
                <div key={i} className="bg-navy border border-white/5 p-4"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                  <div className="text-xs font-mono text-text-muted/40 tracking-wider mb-2">
                    INTEL FILE {i + 1} — LOCKED
                  </div>
                  <div className="flex items-center gap-2 text-text-muted/40">
                    <span className="text-base">🔒</span>
                    <span className="font-head text-xs">Unlocks in {secsUntil}s</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Answer input */}
          {!hasSubmitted && !completing && (
            <form onSubmit={handleSubmit} className="space-y-2 pb-6"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
              <input
                ref={answerRef}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Name the location…"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-navy border border-white/20 focus:outline-none px-4 py-3 text-white font-head text-base placeholder-text-muted/50 transition-colors"
                style={{ '--tw-ring-color': arena.color } as any}
                onFocus={e => (e.target.style.borderColor = arena.color + '99')}
                onBlur={e => (e.target.style.borderColor = '')}
              />
              <button
                type="submit"
                disabled={!guess.trim() || submitting}
                className="w-full py-3 font-head font-bold text-sm tracking-widest transition-colors disabled:opacity-40"
                style={{ background: arena.color, color: '#0a0f1a' }}
              >
                {submitting ? 'CHECKING...' : 'CONFIRM LOCATION'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
