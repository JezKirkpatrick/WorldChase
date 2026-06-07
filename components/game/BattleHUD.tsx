'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import CountdownTimer from '@/components/ui/CountdownTimer'
import RankBadge from '@/components/leaderboard/RankBadge'
import type { Difficulty } from '@/types/game'

interface BattleHUDProps {
  round: number
  totalRounds: number
  difficulty: Difficulty
  timeElapsed: number
  rank: number | null
  tokens: number
  /** Positive = tokens gained (green flash), negative = spent (red), 0 = no flash */
  tokenDelta: number
  soundMuted: boolean
  onToggleSound: () => void
}

export default function BattleHUD({
  round, totalRounds, difficulty, timeElapsed,
  rank, tokens, tokenDelta, soundMuted, onToggleSound,
}: BattleHUDProps) {
  const flashColor = tokenDelta > 0
    ? ['#f5c518', '#22c55e', '#f5c518']   // gold → green → gold (earned)
    : ['#f5c518', '#ff3d3d', '#f5c518']   // gold → red → gold (spent)

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-navy-light/95 backdrop-blur border-b border-gold/20 flex items-center px-2 sm:px-4 gap-1.5 sm:gap-4">
      <Link href="/play" className="font-head font-bold text-gold tracking-widest text-sm hover:text-gold-dim transition-colors whitespace-nowrap hidden sm:block">
        ← ROUNDS
      </Link>
      <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest text-sm hover:text-gold-dim transition-colors whitespace-nowrap sm:hidden">
        ≡
      </Link>

      <div className="w-px h-6 bg-white/10" />

      <div className="flex items-center gap-1 text-sm font-mono text-text-muted">
        <span className="text-electric">◈</span>
        <span>R<span className="text-white font-bold">{round}</span>/{totalRounds}</span>
      </div>

      <div className="hidden sm:block">
        <DifficultyBadge difficulty={difficulty} />
      </div>

      <div className="flex-1" />

      <CountdownTimer seconds={timeElapsed} />

      <div className="w-px h-6 bg-white/10" />

      {rank && <div className="hidden sm:block"><RankBadge rank={rank} /></div>}
      {rank && <div className="w-px h-6 bg-white/10 hidden sm:block" />}

      <motion.div
        key={tokenDelta !== 0 ? `flash-${Date.now()}` : 'idle'}
        animate={tokenDelta !== 0 ? { scale: [1, 1.25, 1], color: flashColor } : {}}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-1 sm:gap-1.5 font-mono font-bold text-gold cursor-default"
      >
        <span>🪙</span>
        <span className="text-base sm:text-lg">{tokens}</span>
        <span className="text-xs text-text-muted font-head hidden sm:block">TOKENS</span>
      </motion.div>

      <div className="w-px h-6 bg-white/10" />

      <button
        onClick={onToggleSound}
        title={soundMuted ? 'Unmute (M)' : 'Mute (M)'}
        className="text-text-muted hover:text-gold transition-colors text-base leading-none p-2 -mr-2"
      >
        {soundMuted ? '🔇' : '🔊'}
      </button>
    </header>
  )
}
