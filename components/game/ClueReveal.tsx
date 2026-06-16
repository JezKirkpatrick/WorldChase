'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '@/lib/sounds'
import type { Clue } from '@/types/game'

interface ClueRevealProps {
  clues: Clue[]
  revealedCount: number
  tokens: number
  onReveal: (clueIndex: number) => Promise<void>
  readOnly?: boolean
  freeClues?: boolean
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'

function DecryptText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(() => {
    // Scramble initial state
    return text.split('').map(c => c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  })

  useEffect(() => {
    // Decrypt animation: each tick reveals one more character
    let iteration = 0
    const interval = setInterval(() => {
      setDisplayed(
        text.split('').map((char, i) => {
          if (i < iteration) return char
          if (char === ' ') return ' '
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      )
      iteration += 2
      if (iteration > text.length) clearInterval(interval)
    }, 30)

    return () => clearInterval(interval)
  }, [text])

  return <span className="decrypt-text font-mono text-sm">{displayed}</span>
}

export default function ClueReveal({ clues, revealedCount, tokens, onReveal, readOnly = false, freeClues = false }: ClueRevealProps) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const [revealing, setRevealing] = useState<number | null>(null)

  async function handleReveal(index: number) {
    if (!freeClues && tokens < 1) return
    setRevealing(index)
    await onReveal(index)
    sounds.reveal()
    setRevealing(null)
    setConfirming(null)
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gold font-head font-bold tracking-widest mb-3 flex items-center gap-2">
        INTELLIGENCE FILES
        <div className="flex-1 h-px bg-gold/20" />
      </div>

      {clues.map((clue, i) => {
        const isRevealed = i <= revealedCount
        const isFree = i === 0
        const shortcut = i + 1

        return (
          <div key={i} className={`border p-3 transition-all ${isRevealed ? 'border-gold/20 bg-navy-mid/50' : 'border-white/10 bg-navy/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-text-muted tracking-wider">
                INTELLIGENCE FILE {shortcut}
                {isFree && <span className="ml-2 text-success">— DECLASSIFIED</span>}
              </span>
              <kbd className="text-xs bg-white/10 px-1.5 py-0.5 font-mono text-text-muted">[{shortcut}]</kbd>
            </div>

            {isRevealed ? (
              <AnimatePresence>
                <motion.p
                  key={`clue-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text text-sm font-head leading-relaxed select-none"
                >
                  {i === revealedCount && !isFree && !readOnly ? <DecryptText text={clue.text} /> : clue.text}
                </motion.p>
              </AnimatePresence>
            ) : readOnly ? (
              <p className="text-text-muted text-xs font-head italic">— not revealed during this run —</p>
            ) : (
              <div>
                {confirming === i ? (
                  <div className="space-y-2">
                    <p className="text-xs text-text-muted font-head">
                      {freeClues
                        ? `Reveal Intelligence File ${shortcut}? (Free on Easy)`
                        : `Spend 1 token to reveal Intelligence File ${shortcut}? (${tokens} token${tokens !== 1 ? 's' : ''} remaining)`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleReveal(i)}
                        disabled={!!revealing}
                        className="w-full sm:w-auto px-3 py-3 bg-gold text-navy text-xs font-head font-bold tracking-wider hover:bg-gold-dim transition-colors disabled:opacity-50"
                      >
                        {revealing === i ? 'DECRYPTING...' : freeClues ? 'REVEAL (FREE)' : 'CONFIRM (−1 TOKEN)'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="w-full sm:w-auto px-3 py-3 border border-white/20 text-text-muted text-xs font-head hover:text-white transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => (freeClues || tokens >= 1) ? setConfirming(i) : undefined}
                    disabled={!freeClues && tokens < 1}
                    className={`w-full flex items-center justify-between text-left group py-2.5 ${!freeClues && tokens < 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs text-text-muted font-head group-hover:text-gold transition-colors">
                      🔒 CLASSIFIED — {freeClues ? 'UNLOCK FREE' : 'UNLOCK FOR 1 TOKEN'}
                    </span>
                    {!freeClues && tokens < 1 && <span className="text-xs text-danger font-head">NO TOKENS</span>}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
