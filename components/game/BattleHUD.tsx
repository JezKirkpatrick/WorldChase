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
  tokenFlash: boolean
}

export default function BattleHUD({ round, totalRounds, difficulty, timeElapsed, rank, tokens, tokenFlash }: BattleHUDProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-navy-light/95 backdrop-blur border-b border-gold/20 flex items-center px-4 gap-4">
      <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest text-sm hover:text-gold-dim transition-colors whitespace-nowrap">
        ≡ WORLD CHASE
      </Link>

      <div className="w-px h-6 bg-white/10" />

      <div className="flex items-center gap-1.5 text-sm font-mono text-text-muted">
        <span className="text-electric">◈</span>
        <span>ROUND <span className="text-white font-bold">{round}</span> OF {totalRounds}</span>
      </div>

      <DifficultyBadge difficulty={difficulty} />

      <div className="flex-1" />

      <CountdownTimer seconds={timeElapsed} />

      <div className="w-px h-6 bg-white/10" />

      {rank && <RankBadge rank={rank} />}

      <div className="w-px h-6 bg-white/10" />

      <motion.div
        animate={tokenFlash ? { scale: [1, 1.3, 1], color: ['#f5c518', '#ff3d3d', '#f5c518'] } : {}}
        className="flex items-center gap-1.5 font-mono font-bold text-gold"
      >
        <span>🪙</span>
        <span className="text-lg">{tokens}</span>
        <span className="text-xs text-text-muted font-head hidden sm:block">TOKENS</span>
      </motion.div>
    </header>
  )
}
