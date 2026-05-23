'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function TokenBalance({ tokens, flash }: { tokens: number; flash?: boolean }) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (flash) setKey(k => k + 1)
  }, [tokens, flash])

  const isLow = tokens <= 2

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={flash ? { scale: 1.3, color: '#ff3d3d' } : {}}
        animate={{ scale: 1, color: isLow ? '#ff9500' : '#f5c518' }}
        className="flex items-center gap-1.5 font-mono font-bold"
      >
        <span className="text-lg">🪙</span>
        <span className={`text-xl ${isLow ? 'text-warning' : 'text-gold'}`}>{tokens}</span>
        <span className="text-xs text-text-muted font-head tracking-widest">TOKENS</span>
      </motion.div>
    </AnimatePresence>
  )
}
