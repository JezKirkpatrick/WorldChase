'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Challenge, PlayerProgress, Guess, Clue } from '@/types/game'

export function useGameState(challengeId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [progress, setProgress] = useState<PlayerProgress | null>(null)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [revealedClues, setRevealedClues] = useState<Clue[]>([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!loadingRef.current) setLoading(true)
    const [challengeRes, progressRes, guessesRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', challengeId).single(),
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).maybeSingle(),
      supabase.from('guesses').select('*').eq('challenge_id', challengeId).order('created_at'),
    ])

    if (challengeRes.data) setChallenge(challengeRes.data)
    if (progressRes.data) {
      setProgress(progressRes.data)
      const p = progressRes.data
      const clues = challengeRes.data?.clues ?? []
      setRevealedClues(clues.slice(0, Math.min(p.clues_revealed + 1, clues.length)))
    } else if (challengeRes.data) {
      setRevealedClues([challengeRes.data.clues[0]])
    }
    if (guessesRes.data) setGuesses(guessesRes.data)
    setLoading(false)
    loadingRef.current = true
  }, [challengeId, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!progress?.started_at || progress.status === 'completed') return
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(progress.started_at!).getTime()) / 1000)
      setTimeElapsed(elapsed)
    }, 1000)
    return () => clearInterval(timer)
  }, [progress])

  return { challenge, progress, guesses, revealedClues, timeElapsed, loading, reload: load }
}
