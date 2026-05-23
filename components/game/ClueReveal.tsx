'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '@/lib/sounds'
import type { Clue } from '@/types/game'

interface ClueRevealProps {
  clues: Clue[]
  revealedCount: number
  tokens: number
  onReveal: (clueIndex: number) => Promise<void>
}

function DecryptText({ text }: { text: string }) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  const [displayed, setDisplayed] = useState(() => {
    let scrambled = ''
    for (let i = 0; i < text.length; i++) {
      scrambled += text[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
    }
    return scrambled
  })

  useState(() => {
    let iteration = 0
    const interval = setInterval(() => {
      setDisplayed(text.split('').map((char, i) => {
        if (i < iteration) return char
        if (char === ' ') return ' '
        return chars[Math.floor(Math.random() * chars.length)]
      }).join(''))
      if (iteration >= text.length) clearInterval(interval)
      iteration += 2
    }, 30)
    return () => clearInterval(interval)
  })

  return <span className="decrypt-text font-mono text-sm">{displayed}</span>
}

export default function ClueReveal({ clues, revealedCount, tokens, onReveal }: ClueRevealProps) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const [revealing, setRevealing] = useState<number | null>(null)

  async function handleReveal(index: number) {
    if (tokens < 1) return
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
          <div key={clue.order} className={`border p-3 transition-all ${isRevealed ? 'border-gold/20 bg-navy-mid/50' : 'border-white/10 bg-navy/50'}`}>
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text text-sm font-head leading-relaxed"
                >
                  {clue.text}
                </motion.p>
              </AnimatePresence>
            ) : (
              <div>
                {confirming === i ? (
                  <div className="space-y-2">
                    <p className="text-xs text-text-muted font-head">
                      Spend 1 token to reveal Intelligence File {shortcut}? ({tokens} tokens remaining)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReveal(i)}
                        disabled={!!revealing}
                        className="px-3 py-1 bg-gold text-navy text-xs font-head font-bold tracking-wider hover:bg-gold-dim transition-colors disabled:opacity-50"
                      >
                        {revealing === i ? 'DECRYPTING...' : 'CONFIRM (−1 TOKEN)'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-3 py-1 border border-white/20 text-text-muted text-xs font-head hover:text-white transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => tokens >= 1 ? setConfirming(i) : null}
                    className={`w-full flex items-center justify-between text-left group ${tokens < 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs text-text-muted font-head group-hover:text-gold transition-colors">
                      🔒 CLASSIFIED — UNLOCK FOR 1 TOKEN
                    </span>
                    {tokens < 1 && <span className="text-xs text-danger">NO TOKENS</span>}
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
