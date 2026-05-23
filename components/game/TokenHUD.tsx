'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TokenHUDProps {
  tokens: number
}

export default function TokenHUD({ tokens }: TokenHUDProps) {
  const [prevTokens, setPrevTokens] = useState(tokens)
  const [flash, setFlash] = useState<'gain' | 'spend' | null>(null)

  useEffect(() => {
    if (tokens < prevTokens) setFlash('spend')
    else if (tokens > prevTokens) setFlash('gain')
    setPrevTokens(tokens)
    if (tokens !== prevTokens) {
      const t = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(t)
    }
  }, [tokens, prevTokens])

  const isLow = tokens <= 2
  const isEmpty = tokens === 0

  return (
    <div className={`flex flex-col gap-1 ${isEmpty ? 'text-danger' : isLow ? 'text-warning' : 'text-gold'}`}>
      <motion.div
        animate={flash === 'spend' ? { scale: [1, 1.3, 1], color: ['#f5c518', '#ff3d3d', '#f5c518'] } :
                 flash === 'gain'  ? { scale: [1, 1.2, 1], color: ['#f5c518', '#00ff88', '#f5c518'] } : {}}
        className="flex items-center gap-2 font-mono font-bold"
      >
        <span className="text-xl">🪙</span>
        <span className="text-2xl">{tokens}</span>
      </motion.div>
      {isLow && !isEmpty && (
        <div className="text-xs font-head text-warning tracking-wider">
          ⚠ {tokens} TOKEN{tokens === 1 ? '' : 'S'} REMAINING
        </div>
      )}
      {isEmpty && (
        <Link href="/tokens" className="text-xs font-head text-danger tracking-wider hover:text-white transition-colors underline">
          🔴 NO TOKENS — RESUPPLY
        </Link>
      )}
    </div>
  )
}
