'use client'
import { motion } from 'framer-motion'

interface TimerBarProps {
  elapsed: number
  limit: number
}

export default function TimerBar({ elapsed, limit }: TimerBarProps) {
  const progress = Math.min(elapsed / limit, 1)
  const pct = `${(progress * 100).toFixed(1)}%`
  const color =
    progress < 0.5 ? '#00d4ff' :
    progress < 0.8 ? '#ff9500' :
    '#ff3d3d'

  return (
    <div className="h-0.5 w-full bg-white/5 overflow-hidden shrink-0">
      <motion.div
        className="h-full"
        animate={{ width: pct, backgroundColor: color }}
        transition={{ duration: 1, ease: 'linear' }}
      />
    </div>
  )
}
