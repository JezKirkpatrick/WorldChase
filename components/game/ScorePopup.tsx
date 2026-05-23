'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ScoreCalculation } from '@/types/game'

interface ScorePopupProps {
  score: ScoreCalculation
  locationName: string
  funFact: string
  rankBefore: number | null
  rankAfter: number | null
  onContinue: () => void
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{value.toLocaleString()}</>
}

export default function ScorePopup({ score, locationName, funFact, rankBefore, rankAfter, onContinue }: ScorePopupProps) {
  const rankImproved = rankBefore && rankAfter && rankAfter < rankBefore

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-navy-light border border-gold/40 bracket-box p-8">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="text-success font-head font-bold text-sm tracking-widest mb-1">LOCATION CONFIRMED</div>
          <div className="text-white font-head font-bold text-2xl">{locationName}</div>
        </motion.div>

        <div className="space-y-2 mb-6 font-mono text-sm">
          <div className="flex justify-between text-text-muted">
            <span>BASE SCORE</span>
            <span className="text-white">+{score.basePoints.toLocaleString()} PTS</span>
          </div>
          {score.clueMultiplier < 1 && (
            <div className="flex justify-between text-text-muted">
              <span>CLUE PENALTY</span>
              <span className="text-danger">−{Math.round(score.basePoints * (1 - score.clueMultiplier)).toLocaleString()} PTS</span>
            </div>
          )}
          {score.attemptPenalty > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>ATTEMPT PENALTY</span>
              <span className="text-danger">−{Math.round(score.basePoints * score.attemptPenalty).toLocaleString()} PTS</span>
            </div>
          )}
          {score.speedBonus > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>⚡ SPEED BONUS</span>
              <span className="text-success">+{Math.round(score.finalScore * score.speedBonus).toLocaleString()} PTS</span>
            </div>
          )}
          <div className="h-px bg-white/10 my-2" />
          <div className="flex justify-between text-gold font-bold text-lg">
            <span>FINAL SCORE</span>
            <span><CountUp target={score.finalScore} /> PTS</span>
          </div>
        </div>

        {rankImproved && rankAfter && rankBefore && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-4 text-success font-mono font-bold"
          >
            ↑ #{rankBefore} → #{rankAfter}
          </motion.div>
        )}

        {funFact && (
          <div className="text-xs text-text-muted border border-white/10 p-3 mb-6 font-head leading-relaxed">
            <span className="text-gold font-bold">FUN FACT: </span>{funFact}
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors"
        >
          CONTINUE TO NEXT ROUND →
        </button>
      </div>
    </motion.div>
  )
}
