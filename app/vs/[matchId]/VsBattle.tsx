'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { flagUrl } from '@/lib/flagEmoji'
import { safeDisplayName } from '@/lib/userDisplay'

interface VsMatch {
  id: string
  challenge_id: string
  challenger_id: string
  opponent_id: string | null
  wager: number
  status: string
  match_type: string
  invited_friend_id: string | null
  winner_id: string | null
  challenger_solved_at: string | null
  opponent_solved_at: string | null
  started_at: string | null
  expires_at: string
  created_at: string
}

interface SafeChallenge {
  riddle_text: string
  clues: { order: number; text: string }[]
  difficulty: string
  location_country: string
}

interface HunterProfile {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
  equipped_border?: string | null
  country_code?: string | null
}

interface Props {
  match: VsMatch
  challenge: SafeChallenge | null
  currentUserId: string
  challenger: HunterProfile | null
  opponent: HunterProfile | null
}

export default function VsBattle({ match: initialMatch, challenge, currentUserId, challenger, opponent }: Props) {
  const router = useRouter()
  const [match, setMatch] = useState(initialMatch)
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reveal, setReveal] = useState<{ locationName: string; locationCountry: string; funFact: string } | null>(null)

  const isChallenger = currentUserId === match.challenger_id
  const isOpponent = currentUserId === match.opponent_id
  const myProfile = isChallenger ? challenger : opponent
  const theirProfile = isChallenger ? opponent : challenger
  const mySolvedAt = isChallenger ? match.challenger_solved_at : match.opponent_solved_at
  const theirSolvedAt = isChallenger ? match.opponent_solved_at : match.challenger_solved_at

  // Tick the elapsed timer while active
  useEffect(() => {
    if (match.status !== 'active' || !match.started_at) return
    const start = new Date(match.started_at).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [match.status, match.started_at])

  // Fetch answer reveal when match completes
  useEffect(() => {
    if (match.status !== 'completed' || reveal) return
    fetch(`/api/vs/reveal/${match.id}`)
      .then(r => r.json())
      .then(d => { if (d.locationName) setReveal(d) })
      .catch(() => {})
  }, [match.status, match.id, reveal])

  // Supabase Realtime — live match updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`vs:${match.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vs_matches',
        filter: `id=eq.${match.id}`,
      }, payload => {
        const updated = payload.new as VsMatch
        setMatch(updated)
        // Reload server data when opponent joins so we get their profile
        if (updated.status === 'active' && initialMatch.status === 'pending') {
          router.refresh()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [match.id, initialMatch.status, router])

  async function handleJoin() {
    setJoining(true)
    setJoinError('')
    const res = await fetch('/api/vs/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    })
    const data = await res.json()
    if (!res.ok) { setJoinError(data.error ?? 'Failed to join'); setJoining(false); return }
    // Realtime will update match.status → active
  }

  async function handleCancel() {
    setCancelling(true)
    await fetch('/api/vs/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    })
    router.push('/vs')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!guess.trim() || submitting || !!mySolvedAt) return
    setSubmitting(true)
    const res = await fetch('/api/vs/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, guess: guess.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    setFeedback({ correct: data.correct, message: data.message })
    if (data.correct) setGuess('')
  }

  function blockCopy(e: React.SyntheticEvent) { e.preventDefault() }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clues = challenge ? [...challenge.clues].sort((a, b) => a.order - b.order) : []
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  // ── PENDING — challenger waiting ──────────────────────────────────────────
  if (match.status === 'pending' && isChallenger) {
    const isQueue = match.match_type === 'queue'

    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {isQueue ? (
            /* ── VS WORLD queue waiting ── */
            <div className="text-center">
              <div className="text-xs text-gold font-head tracking-[0.3em] mb-3">VS WORLD</div>
              <h1 className="font-head font-bold text-2xl text-white mb-1">SEARCHING THE GLOBE</h1>
              <p className="text-text-muted font-head text-sm mb-10">
                Wager: <span className="text-gold font-bold">{match.wager}</span> tokens each &nbsp;·&nbsp;
                Pot: <span className="text-gold font-bold">{match.wager * 2}</span> tokens
              </p>

              {/* Radar animation */}
              <div className="relative w-24 h-24 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full border border-electric/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-3 rounded-full border border-electric/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                <div className="absolute inset-6 rounded-full border border-electric/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
                <div className="absolute inset-9 rounded-full bg-electric/20 border border-electric flex items-center justify-center">
                  <span className="text-electric text-xs">🌍</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-10">
                <span className="text-electric font-head text-sm tracking-[0.3em]">FINDING OPPONENT</span>
                <span className="w-1.5 h-1.5 bg-electric rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-electric rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-electric rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>

              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-2.5 border border-danger/30 text-danger font-head text-xs tracking-widest hover:bg-danger/10 transition-colors disabled:opacity-40"
              >
                {cancelling ? 'LEAVING...' : 'LEAVE QUEUE (tokens refunded)'}
              </button>
            </div>
          ) : (
            /* ── Open / friend invite — share link ── */
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">⚔️</div>
                <h1 className="font-head font-bold text-2xl text-white">
                  {match.match_type === 'friend_invite' ? 'CHALLENGE SENT' : 'DUEL CREATED'}
                </h1>
                <p className="text-text-muted font-head text-sm mt-2">
                  Wager: <span className="text-gold font-bold">{match.wager}</span> tokens each &nbsp;·&nbsp;
                  Pot: <span className="text-gold font-bold">{match.wager * 2}</span> tokens
                </p>
              </div>

              <div className="bg-navy-light border border-electric/30 p-6 mb-4">
                <div className="text-xs font-head text-electric tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-electric rounded-full animate-pulse" />
                  {match.match_type === 'friend_invite' ? 'WAITING FOR FRIEND' : 'WAITING FOR OPPONENT'}
                </div>
                <p className="text-text-muted font-head text-sm mb-3">
                  {match.match_type === 'friend_invite'
                    ? 'Your friend has been notified. You can also share this link:'
                    : 'Share this link to challenge a hunter:'}
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-navy border border-white/20 px-3 py-2 font-mono text-xs text-text truncate"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 border border-gold/40 font-head text-xs font-bold text-gold hover:bg-gold/10 transition-all whitespace-nowrap"
                  >
                    {copied ? '✓' : 'COPY'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-2.5 border border-danger/30 text-danger font-head text-xs tracking-widest hover:bg-danger/10 transition-colors disabled:opacity-40"
              >
                {cancelling ? 'CANCELLING...' : 'CANCEL DUEL (tokens refunded)'}
              </button>

              <div className="mt-6 text-center">
                <a href="/vs" className="text-text-muted font-head text-sm hover:text-white transition-colors">← All duels</a>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── PENDING — potential opponent viewing ──────────────────────────────────
  if (match.status === 'pending' && !isChallenger) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">⚔️</div>
            <h1 className="font-head font-bold text-2xl text-white">DUEL CHALLENGE</h1>
          </div>

          <div className="bg-navy-light border border-gold/30 p-6 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative shrink-0">
                <span className="text-3xl leading-none">{challenger?.equipped_avatar ?? '🌍'}</span>
                {challenger?.country_code && flagUrl(challenger.country_code) && (
                  <img src={flagUrl(challenger.country_code)} alt="" aria-hidden className="absolute -bottom-1 -right-1 w-4 h-3 rounded-sm shadow-sm pointer-events-none" />
                )}
              </div>
              <div>
                <div className="font-head font-bold text-white text-sm">
                  {safeDisplayName(challenger)}
                </div>
                <div className="text-text-muted font-head text-xs">is challenging you to a duel</div>
              </div>
            </div>

            <div className="bg-navy border border-white/10 p-4 rounded mb-5 text-center">
              <div className="text-text-muted font-head text-xs mb-1">EACH WAGERS</div>
              <div className="text-gold font-head font-bold text-3xl">{match.wager}</div>
              <div className="text-xs font-head text-text-muted mt-1">tokens</div>
              <div className="mt-2 pt-2 border-t border-white/10 text-electric font-head text-xs font-bold">
                Winner takes {match.wager * 2} tokens
              </div>
            </div>

            <p className="text-text-muted font-head text-xs leading-relaxed mb-5">
              You'll both see the same geography riddle at the same time. First hunter to name the correct location wins the entire pot. No clue unlocks — pure knowledge race.
            </p>

            {joinError && <div className="text-danger text-xs font-head mb-3">{joinError}</div>}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40"
            >
              {joining ? 'JOINING...' : `ACCEPT DUEL — WAGER ${match.wager} TOKENS`}
            </button>
          </div>

          <div className="text-center">
            <a href="/vs" className="text-text-muted font-head text-sm hover:text-white transition-colors">← Decline</a>
          </div>
        </div>
      </div>
    )
  }

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (match.status === 'completed') {
    const iWon = match.winner_id === currentUserId
    const nobody = !match.winner_id

    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">
            {nobody ? '🤝' : iWon ? '🏆' : '💀'}
          </div>
          <h1 className="font-head font-bold text-3xl text-white mb-2">
            {nobody ? 'TIE GAME' : iWon ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p className="text-text-muted font-head text-sm mb-6">
            {nobody
              ? 'Wagers returned to both hunters.'
              : iWon
                ? `+${match.wager * 2} tokens added to your balance.`
                : `${safeDisplayName(theirProfile)} was faster.`}
          </p>

          {reveal && (
            <div className="bg-navy-light border border-gold/20 p-5 text-left mb-6">
              <div className="text-xs font-head text-gold tracking-widest mb-2">THE ANSWER WAS</div>
              <div className="text-white font-head font-bold text-xl mb-1">{reveal.locationName}</div>
              <div className="text-text-muted font-head text-xs mb-3">{reveal.locationCountry}</div>
              {reveal.funFact && (
                <p className="text-text-muted font-head text-xs leading-relaxed border-t border-white/10 pt-3">
                  {reveal.funFact}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/vs" className="px-6 py-3 border border-white/20 text-text-muted font-head text-sm hover:text-white transition-colors">
              ← DUELS
            </a>
            <a href="/play" className="px-6 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors">
              PLAY MAIN GAME
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── ACTIVE BATTLE ─────────────────────────────────────────────────────────
  return (
    <div className="h-dvh bg-navy flex flex-col overflow-hidden">

      {/* Battle HUD */}
      <header className="shrink-0 h-12 bg-navy-light/95 backdrop-blur border-b border-gold/20 flex items-center px-3 gap-2">
        <a href="/vs" className="font-head font-bold text-gold text-xs tracking-widest hover:text-gold-dim shrink-0">← VS</a>
        <div className="w-px h-6 bg-white/10" />

        {/* Player indicators */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="relative shrink-0">
              <span className="text-base leading-none">{myProfile?.equipped_avatar ?? '🌍'}</span>
              {myProfile?.country_code && flagUrl(myProfile.country_code) && (
                <img src={flagUrl(myProfile.country_code)} alt="" aria-hidden className="absolute -bottom-0.5 -right-0.5 w-3 h-2 rounded-sm pointer-events-none" />
              )}
            </div>
            <span className="font-head text-xs text-white font-bold">YOU</span>
            {mySolvedAt && <span className="text-success text-sm">✓</span>}
          </div>

          <div className="font-head font-bold text-gold text-sm">VS</div>

          <div className="flex items-center gap-1.5">
            <span className="font-head text-xs text-text-muted truncate max-w-[80px]">
              {safeDisplayName(theirProfile)}
            </span>
            <div className="relative shrink-0">
              <span className="text-base leading-none">{theirProfile?.equipped_avatar ?? '🌍'}</span>
              {theirProfile?.country_code && flagUrl(theirProfile.country_code) && (
                <img src={flagUrl(theirProfile.country_code)} alt="" aria-hidden className="absolute -bottom-0.5 -right-0.5 w-3 h-2 rounded-sm pointer-events-none" />
              )}
            </div>
            {theirSolvedAt && <span className="text-success text-sm">✓</span>}
          </div>
        </div>

        <div className="w-px h-6 bg-white/10" />
        <div className="font-mono text-gold font-bold text-sm shrink-0">⏱ {fmt(elapsed)}</div>
        <div className="w-px h-6 bg-white/10" />
        <div className="font-mono text-xs text-gold shrink-0">🪙{match.wager * 2}</div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Live status banners */}
          {theirSolvedAt && !mySolvedAt && (
            <div className="bg-danger/10 border border-danger/40 px-4 py-3 font-head text-sm text-danger animate-pulse">
              ⚠️ Opponent just solved it — submit your answer NOW!
            </div>
          )}
          {mySolvedAt && !theirSolvedAt && (
            <div className="bg-success/10 border border-success/40 px-4 py-3 font-head text-sm text-success">
              ⚡ Correct! Waiting to see if opponent answers in time…
            </div>
          )}
          {feedback && (
            <div className={`px-4 py-3 font-head text-sm border ${
              feedback.correct
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-white/5 border-white/10 text-text-muted'
            }`}>
              {feedback.message}
            </div>
          )}

          {/* Riddle — copy / paste / context-menu all blocked */}
          <div
            className="bg-navy-light border border-gold/20 p-5 select-none"
            onCopy={blockCopy}
            onCut={blockCopy}
            onContextMenu={blockCopy}
          >
            <div className="text-xs text-gold font-head font-bold tracking-widest mb-3 flex items-center gap-2">
              MISSION BRIEFING
              <div className="flex-1 h-px bg-gold/20" />
              <span className="text-text-muted normal-case font-normal">{challenge?.difficulty}</span>
            </div>
            <p
              className="text-text font-head text-base leading-relaxed"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {challenge?.riddle_text ?? ''}
            </p>
          </div>

          {/* All clues revealed upfront — VS mode is a pure speed race */}
          <div
            className="space-y-2 select-none"
            onCopy={blockCopy}
            onCut={blockCopy}
            onContextMenu={blockCopy}
          >
            {clues.map((clue, i) => (
              <div
                key={i}
                className="bg-navy-light border border-white/10 p-4"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <div className="text-xs font-mono text-text-muted tracking-wider mb-1">
                  INTEL FILE {i + 1}
                  {i === 0 && <span className="ml-2 text-success">— DECLASSIFIED</span>}
                </div>
                <p className="text-text font-head text-sm leading-relaxed">{clue.text}</p>
              </div>
            ))}
          </div>

          {/* Answer input */}
          {!mySolvedAt && (
            <form onSubmit={handleSubmit} className="space-y-2 pb-6">
              <input
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Name the location…"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head text-base placeholder-text-muted/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!guess.trim() || submitting}
                className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40"
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
