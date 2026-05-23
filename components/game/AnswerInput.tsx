'use client'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getPreviewScore } from '@/lib/scoring'
import { sounds } from '@/lib/sounds'
import type { Difficulty } from '@/types/game'

interface AnswerInputProps {
  difficulty: Difficulty
  cluesRevealed: number
  attempts: number
  maxAttempts: number
  lastFeedback: string | null
  lastCorrect: boolean | null
  onSubmit: (answer: string) => Promise<void>
  onSkip: () => void
  tokens: number
  focusTrigger: number
}

export default function AnswerInput({
  difficulty, cluesRevealed, attempts, maxAttempts,
  lastFeedback, lastCorrect, onSubmit, onSkip, tokens, focusTrigger
}: AnswerInputProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusTrigger > 0) inputRef.current?.focus()
  }, [focusTrigger])

  useEffect(() => { sounds.init() }, [])

  useEffect(() => {
    if (lastCorrect === true) sounds.correct()
    if (lastCorrect === false) {
      sounds.wrong()
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }, [lastCorrect, lastFeedback])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!answer.trim() || submitting || attempts >= maxAttempts) return
    setSubmitting(true)
    await onSubmit(answer.trim())
    setSubmitting(false)
    setAnswer('')
  }

  const remaining = maxAttempts - attempts
  const previewScore = getPreviewScore(difficulty, cluesRevealed, Math.max(0, attempts - (lastCorrect ? 0 : 0)))

  return (
    <div className="space-y-3">
      <div className="text-xs text-gold font-head font-bold tracking-widest flex items-center gap-2">
        SUBMIT YOUR LOCATION
        <div className="flex-1 h-px bg-gold/20" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <motion.div animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
          <input
            ref={inputRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Name the location..."
            disabled={attempts >= maxAttempts || submitting}
            className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head text-base placeholder-text-muted/50 transition-colors disabled:opacity-50"
          />
        </motion.div>

        {lastFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-head px-3 py-2 border ${lastCorrect ? 'text-success border-success/30 bg-success/10' : 'text-danger border-danger/30 bg-danger/10'}`}
          >
            {lastFeedback}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={!answer.trim() || submitting || attempts >= maxAttempts}
          className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'CHECKING...' : 'CONFIRM LOCATION  [ENTER ↵]'}
        </button>
      </form>

      {/* Attempts tracker */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: maxAttempts }).map((_, i) => (
            <div key={i} className={`w-4 h-4 border ${i < attempts ? 'bg-danger/60 border-danger/60' : 'border-white/20'}`} />
          ))}
        </div>
        <span className="text-xs font-mono text-text-muted">{remaining} ATTEMPT{remaining !== 1 ? 'S' : ''} REMAINING</span>
      </div>

      <div className="text-xs font-mono text-text-muted">
        CURRENT MAX SCORE: <span className="text-gold font-bold">{previewScore.toLocaleString()} PTS</span>
      </div>

      {/* Skip */}
      <div className="pt-2 border-t border-white/10">
        {confirmSkip ? (
          <div className="space-y-2">
            <p className="text-xs text-text-muted font-head">
              ABORT THIS ROUND? Costs 2 tokens. Awards 0 points. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onSkip(); setConfirmSkip(false) }}
                disabled={tokens < 2}
                className="px-3 py-1 bg-danger/20 border border-danger/50 text-danger text-xs font-head tracking-wider hover:bg-danger/30 transition-colors disabled:opacity-40"
              >
                SKIP ROUND (−2 TOKENS)
              </button>
              <button onClick={() => setConfirmSkip(false)} className="px-3 py-1 border border-white/20 text-text-muted text-xs font-head hover:text-white">
                CONTINUE HUNTING
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSkip(true)}
            disabled={tokens < 2}
            className="text-xs font-head text-text-muted hover:text-danger transition-colors disabled:opacity-40"
          >
            SKIP ROUND (2 tokens) →
          </button>
        )}
      </div>
    </div>
  )
}
