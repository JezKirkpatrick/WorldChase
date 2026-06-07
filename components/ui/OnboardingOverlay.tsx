'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  {
    emoji: '🌍',
    title: 'WELCOME, HUNTER',
    body: "You've been dropped somewhere on Earth. Your mission: figure out exactly where you are using only cryptic clues and your wits.",
  },
  {
    emoji: '📁',
    title: 'READ THE INTELLIGENCE FILES',
    body: 'Your first clue is free and already unlocked. Read it carefully — each clue narrows down the location. On Easy difficulty, all clues are free.',
  },
  {
    emoji: '🗺',
    title: 'EXPLORE THE MAP',
    body: 'The map shows the real location via Street View or satellite. Pan around, look for signs, landmarks, or landscape features that match the clues.',
  },
  {
    emoji: '✍️',
    title: 'SUBMIT YOUR LOCATION',
    body: "Type the name of the place — city, landmark, or country. You have multiple attempts. The faster you crack it with fewer clues, the higher your score.",
  },
  {
    emoji: '🏆',
    title: "YOU'RE READY",
    body: 'Complete rounds to climb the global leaderboard. New hunt every month. Good luck — the world is watching.',
  },
]

const STORAGE_KEY = 'wc_onboarded_v1'

export default function OnboardingOverlay() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const isLast = step === STEPS.length - 1
  const s = STEPS[step]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        >
          <motion.div
            key={step}
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm bg-navy-light border border-gold/30 p-8 text-center relative"
            style={{ boxShadow: '0 0 60px rgba(245,197,24,0.12)' }}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/60 to-gold/0" />

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-gold' : 'w-2 bg-white/20'}`} />
              ))}
            </div>

            <div className="text-5xl mb-4">{s.emoji}</div>
            <div className="text-gold font-head font-bold tracking-widest text-sm mb-3">{s.title}</div>
            <p className="text-text font-head text-sm leading-relaxed mb-8">{s.body}</p>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 border border-white/20 text-text-muted font-head text-xs font-bold tracking-widest hover:border-white/40 hover:text-white transition-colors"
                >
                  BACK
                </button>
              )}
              <button
                onClick={isLast ? dismiss : () => setStep(s => s + 1)}
                className="flex-1 py-3 bg-gold text-navy font-head text-xs font-bold tracking-widest hover:bg-gold-dim transition-colors"
              >
                {isLast ? "LET'S HUNT →" : 'NEXT →'}
              </button>
            </div>

            {!isLast && (
              <button
                onClick={dismiss}
                className="mt-3 text-xs text-text-muted font-head hover:text-white transition-colors"
              >
                Skip tutorial
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
