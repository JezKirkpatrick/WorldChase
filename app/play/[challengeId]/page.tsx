'use client'

export const dynamic = 'force-dynamic'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { useKeyboard } from '@/hooks/useKeyboard'
import { sounds } from '@/lib/sounds'
import { useToast } from '@/components/ui/Toast'
import BattleHUD from '@/components/game/BattleHUD'
import RiddlePanel from '@/components/game/RiddlePanel'
import MapPanel from '@/components/game/MapPanel'
import ScorePopup from '@/components/game/ScorePopup'
import TimerBar from '@/components/game/TimerBar'
import Modal from '@/components/ui/Modal'
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboard'
import type { ScoreCalculation } from '@/types/game'

interface PageProps { params: { challengeId: string } }

export default function GamePage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { challenge, progress, guesses, revealedClues, timeElapsed, loading, loadError, reload } = useGameState(params.challengeId)

  const [userId, setUserId] = useState<string | null>(null)
  const [tokens, setTokens] = useState(0)
  const [rank, setRank] = useState<number | null>(null)
  // tokenDelta: positive = gained (green flash), negative = spent (red flash), 0 = no flash
  const [tokenDelta, setTokenDelta] = useState(0)
  const [radarActive, setRadarActive] = useState(false)
  const [personalMarkers, setPersonalMarkers] = useState<{ lat: number; lng: number; id: string }[]>([])
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [scorePopup, setScorePopup] = useState<{ score: ScoreCalculation; funFact: string } | null>(null)
  const [focusTrigger, setFocusTrigger] = useState(0)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    sounds.init()
    setSoundMuted(sounds.isMuted())

    if ((window as any).google?.maps) { setMapsReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (existing) {
      existing.addEventListener('load', () => setMapsReady(true))
      return
    }
    const script = document.createElement('script')
    script.id = 'gmap-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`
    script.async = true
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [])

  // Load tokens + rank once challenge is known
  useEffect(() => {
    if (!challenge) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setTokens(data.tokens ?? 0) })
      supabase.from('leaderboard').select('rank').eq('user_id', user.id).eq('event_id', challenge.event_id).maybeSingle()
        .then(({ data }) => { if (data?.rank) setRank(data.rank) })
    })
  }, [challenge, router])

  function flashToken(newBalance: number, prev: number) {
    const delta = newBalance - prev
    setTokenDelta(delta)
    setTimeout(() => setTokenDelta(0), 700)
    setTokens(newBalance)
  }

  const handleRevealClue = useCallback(async (index: number) => {
    if (!userId || !challenge) return
    const res = await fetch('/api/game/reveal-clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge.id, userId, clueIndex: index }),
    })
    const data = await res.json()
    if (data.error) { toast(data.error, 'error'); return }
    if (data.newTokenBalance !== undefined) {
      flashToken(data.newTokenBalance, tokens)
      sounds.token()
      toast(`−1 token · Intelligence File ${index + 1} unlocked`, 'info')
    }
    await reload()
  }, [userId, challenge, reload, tokens, toast])

  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (!userId || !challenge) return
    const res = await fetch('/api/game/submit-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessText: answer, challengeId: challenge.id, userId }),
    })
    const data = await res.json()
    setLastFeedback(data.feedback)
    setLastCorrect(data.is_correct)
    if (data.is_correct && data.score) {
      setScorePopup({ score: data.score, funFact: challenge.fun_fact })
      // +1 token for completing a round
      setTokens(t => {
        const next = t + 1
        flashToken(next, t)
        return next
      })
    }
    await reload()
  }, [userId, challenge, reload])

  const handleSkip = useCallback(async () => {
    if (!userId || !challenge) return
    const res = await fetch('/api/game/skip-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge.id, userId }),
    })
    const data = await res.json()
    if (data.error) { toast(data.error, 'error'); return }
    if (data.newTokenBalance !== undefined) flashToken(data.newTokenBalance, tokens)
    toast('Round skipped', 'info')
    router.push('/play')
  }, [userId, challenge, router, tokens, toast])

  const panMap = useCallback((dx: number, dy: number) => {
    if (!mapRef.current) return
    const c = mapRef.current.getCenter()!
    const z = mapRef.current.getZoom() ?? 12
    const scale = 156543.03392 * Math.cos(c.lat() * Math.PI / 180) / Math.pow(2, z)
    mapRef.current.setCenter({
      lat: c.lat() - (dy * scale / 111320),
      lng: c.lng() + (dx * scale / (111320 * Math.cos(c.lat() * Math.PI / 180))),
    })
  }, [])

  const toggleSound = useCallback(() => {
    const next = !sounds.isMuted()
    sounds.setMuted(next)
    setSoundMuted(next)
    toast(next ? '🔇 Sound off' : '🔊 Sound on', 'info')
  }, [toast])

  const toggleFullscreen = useCallback(() => {
    const el = mapContainerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [])

  const toggleSatellite = useCallback(() => {
    if (!mapRef.current) return
    const current = mapRef.current.getMapTypeId()
    mapRef.current.setMapTypeId(current === 'satellite' ? 'roadmap' : 'satellite')
  }, [])

  useKeyboard({
    map_pan_north:    () => panMap(0, -100),
    map_pan_south:    () => panMap(0, 100),
    map_pan_west:     () => panMap(-100, 0),
    map_pan_east:     () => panMap(100, 0),
    map_zoom_in:      () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1),
    map_zoom_out:     () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1),
    toggle_streetview: () => {
      const sv = mapRef.current?.getStreetView()
      if (sv) sv.setVisible(!sv.getVisible())
    },
    toggle_satellite:      toggleSatellite,
    reset_map_view: () => {
      if (challenge && mapRef.current) {
        mapRef.current.setCenter({ lat: challenge.map_start_lat, lng: challenge.map_start_lng })
        mapRef.current.setZoom(12)
      }
    },
    toggle_fullscreen_map: toggleFullscreen,
    toggle_token_radar:    () => setRadarActive(a => !a),
    focus_answer_input:    () => setFocusTrigger(n => n + 1),
    reveal_clue_1:  () => setFocusTrigger(n => n + 1), // clue 1 is free — just focus input
    reveal_clue_2:  () => progress && progress.clues_revealed < 1 && tokens > 0 && handleRevealClue(1),
    reveal_clue_3:  () => progress && progress.clues_revealed < 2 && tokens > 0 && handleRevealClue(2),
    reveal_clue_4:  () => progress && progress.clues_revealed < 3 && tokens > 0 && handleRevealClue(3),
    goto_leaderboard:      () => router.push('/leaderboard'),
    goto_dashboard:        () => router.push('/dashboard'),
    show_keyboard_shortcuts: () => setShortcutsOpen(true),
    close_modal:           () => setShortcutsOpen(false),
    toggle_sound:          toggleSound,
  })

  if (loadError) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-4">
        <div className="text-2xl">⚠️</div>
        <div className="text-danger font-head font-bold tracking-widest">{loadError}</div>
        <button onClick={reload} className="px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors">
          RETRY
        </button>
        <a href="/play" className="text-text-muted font-head text-sm hover:text-white transition-colors">← Back to rounds</a>
      </div>
    )
  }

  if (loading || !challenge || !progress) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <div className="text-gold font-head font-bold tracking-widest animate-pulse">LOADING MISSION...</div>
      </div>
    )
  }

  const nextRound = challenge.round_number < 20 ? challenge.round_number + 1 : null

  return (
    <div ref={mapContainerRef} className="h-screen flex flex-col bg-navy overflow-hidden">
      <BattleHUD
        round={challenge.round_number}
        totalRounds={20}
        difficulty={challenge.difficulty}
        timeElapsed={timeElapsed}
        rank={rank}
        tokens={tokens}
        tokenDelta={tokenDelta}
        soundMuted={soundMuted}
        onToggleSound={toggleSound}
      />

      <TimerBar elapsed={timeElapsed} limit={challenge.time_limit_seconds} />

      <div className="flex flex-1 overflow-hidden pt-12">
        {/* Left panel — collapsible */}
        {!panelCollapsed && (
          <div className="w-[38%] min-w-[300px] max-w-[480px] flex flex-col overflow-hidden relative">
            <RiddlePanel
              challenge={challenge}
              progress={progress}
              revealedClues={revealedClues}
              guesses={guesses}
              tokens={tokens}
              lastFeedback={lastFeedback}
              lastCorrect={lastCorrect}
              focusTrigger={focusTrigger}
              onRevealClue={handleRevealClue}
              onSubmitAnswer={handleSubmitAnswer}
              onSkip={handleSkip}
            />
          </div>
        )}

        {/* Right panel — map */}
        <div className="flex-1 relative">
          <button
            onClick={() => setPanelCollapsed(c => !c)}
            className="absolute top-2 left-2 z-20 bg-navy/90 border border-gold/40 px-2 py-1 font-head text-xs font-bold text-gold hover:border-gold transition-all"
            title={panelCollapsed ? 'Show mission panel (P)' : 'Hide mission panel (P)'}
          >
            {panelCollapsed ? '▶ SHOW' : '◀ HIDE'}
          </button>

          {(challenge as any).street_view_only && (challenge as any).street_view_question && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-navy-light/98 border-b border-electric/60 px-4 py-2.5 flex items-center gap-3 pl-20 shadow-lg">
              <span className="text-electric font-head font-bold text-xs tracking-widest shrink-0">👁 OBSERVE</span>
              <span className="text-white font-head text-sm font-bold drop-shadow">{(challenge as any).street_view_question}</span>
            </div>
          )}

          {mapsReady ? (
            <MapPanel
              startLat={challenge.map_start_lat}
              startLng={challenge.map_start_lng}
              startZoom={challenge.difficulty === 'extreme' ? 4 : challenge.difficulty === 'hard' ? 6 : challenge.difficulty === 'medium' ? 9 : 12}
              streetViewOnly={(challenge as any).street_view_only ?? false}
              streetViewHeading={challenge.street_view_heading}
              streetViewPitch={challenge.street_view_pitch}
              challengeId={challenge.id}
              radarActive={radarActive}
              onCenterChange={(lat, lng) => {}}
              markers={personalMarkers}
              onMarkerAdd={(lat, lng) => {
                if (personalMarkers.length >= 5) { toast('Max 5 pins per round', 'info'); return }
                setPersonalMarkers(m => [...m, { lat, lng, id: Math.random().toString(36).slice(2) }])
              }}
              onMarkerRemove={id => setPersonalMarkers(m => m.filter(x => x.id !== id))}
              mapRef={mapRef}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2035] gap-3">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <div className="text-text-muted font-head text-sm animate-pulse">LOADING MAP...</div>
            </div>
          )}
        </div>
      </div>

      {/* Score popup */}
      {scorePopup && progress.status === 'completed' && (
        <ScorePopup
          score={scorePopup.score}
          locationName={challenge.location_name}
          funFact={scorePopup.funFact}
          rankBefore={rank}
          rankAfter={rank ? rank - 1 : null}
          nextRound={nextRound}
          onContinue={() => router.push('/play')}
        />
      )}

      {/* Keyboard shortcuts modal */}
      <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="KEYBOARD SHORTCUTS" size="lg">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {['Map', 'Game', 'Nav'].map(group => {
            const items = KEYBOARD_SHORTCUTS.filter(s => s.group === group)
            return (
              <div key={group} className={group === 'Nav' ? 'col-span-2 mt-2' : ''}>
                <div className="text-xs font-head text-text-muted tracking-widest mb-1 pt-2 border-t border-white/5">{group}</div>
                <div className={group === 'Nav' ? 'grid grid-cols-2 gap-x-8 gap-y-1' : ''}>
                  {items.map(s => (
                    <div key={s.key + s.action} className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-text-muted font-head text-sm">{s.action}</span>
                      <kbd className="bg-white/10 px-2 py-0.5 font-mono text-xs text-gold ml-4">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* Sound + shortcuts hints */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 z-30">
        <button
          onClick={toggleSound}
          title={soundMuted ? 'Unmute (M)' : 'Mute (M)'}
          className="w-8 h-8 rounded-full bg-navy-light border border-white/20 text-text-muted text-sm hover:border-gold/40 hover:text-gold transition-all"
        >
          {soundMuted ? '🔇' : '🔊'}
        </button>
        <button
          onClick={() => setShortcutsOpen(true)}
          className="w-8 h-8 rounded-full bg-navy-light border border-white/20 text-text-muted font-mono text-sm hover:border-gold/40 hover:text-gold transition-all"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      </div>
    </div>
  )
}
