'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Challenge, PlayerProgress, Guess, Clue } from '@/types/game'

export function useGameState(challengeId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [progress, setProgress] = useState<PlayerProgress | null>(null)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [revealedClues, setRevealedClues] = useState<Clue[]>([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const supabase = createClient()

    try {
      // 1. Get authenticated user — must happen before any RLS-gated query
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoadError('Not authenticated — please log in again.')
        setLoading(false)
        return
      }

      // 2. Load challenge + user's guesses in parallel
      const [challengeRes, guessesRes] = await Promise.all([
        supabase.from('challenges').select('*').eq('id', challengeId).single(),
        supabase.from('guesses').select('*').eq('challenge_id', challengeId).eq('user_id', user.id).order('created_at'),
      ])

      if (challengeRes.error || !challengeRes.data) {
        setLoadError('Challenge not found.')
        setLoading(false)
        return
      }
      const ch = challengeRes.data as Challenge
      setChallenge(ch)
      setGuesses(guessesRes.data ?? [])

      // 3. Load this user's progress (filtered by user_id)
      const { data: progressData } = await supabase
        .from('player_progress')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .maybeSingle()

      let finalProgress = progressData as PlayerProgress | null

      // 4. Auto-start if no progress row exists yet
      if (!finalProgress) {
        const { data: newProgress } = await supabase
          .from('player_progress')
          .insert({
            user_id: user.id,
            event_id: ch.event_id,
            challenge_id: challengeId,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .select()
          .single()

        // Ensure leaderboard entry exists
        await supabase.from('leaderboard').upsert(
          { user_id: user.id, event_id: ch.event_id, total_score: 0 },
          { onConflict: 'user_id,event_id', ignoreDuplicates: true }
        )

        finalProgress = newProgress as PlayerProgress | null
      }

      // 5. Set progress and resolve revealed clues
      if (finalProgress) {
        setProgress(finalProgress)
        const clues: Clue[] = ch.clues ?? []
        const revealCount = Math.min((finalProgress.clues_revealed ?? 0) + 1, clues.length)
        setRevealedClues(clues.slice(0, revealCount))
      } else {
        // Fallback: show first clue even if progress insert failed
        setRevealedClues(ch.clues ? [ch.clues[0]] : [])
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load game data.')
    }

    setLoading(false)
  }, [challengeId])

  // Initial load
  useEffect(() => { load() }, [load])

  // Timer
  useEffect(() => {
    if (!progress?.started_at || progress.status === 'completed') return
    const start = new Date(progress.started_at).getTime()
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [progress?.started_at, progress?.status])

  return { challenge, progress, guesses, revealedClues, timeElapsed, loading, loadError, reload: load }
}
