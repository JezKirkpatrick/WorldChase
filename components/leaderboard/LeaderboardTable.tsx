'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import RankBadge from './RankBadge'
import Avatar from '@/components/ui/Avatar'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { LeaderboardEntry } from '@/types/game'

interface LeaderboardTableProps {
  eventId: string
  currentUserId?: string
}

const PODIUM_BG: Record<number, string> = {
  1: 'bg-yellow-400/8 border-yellow-400/40',
  2: 'bg-gray-300/5 border-gray-300/25',
  3: 'bg-amber-600/5 border-amber-600/25',
}

const RANK_GLOW: Record<number, string> = {
  1: 'shadow-[0_0_20px_rgba(250,204,21,0.15)]',
  2: 'shadow-[0_0_12px_rgba(200,200,200,0.08)]',
  3: 'shadow-[0_0_12px_rgba(180,100,20,0.08)]',
}

export default function LeaderboardTable({ eventId, currentUserId }: LeaderboardTableProps) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/leaderboard?eventId=${eventId}&limit=100`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries ?? []); setLoading(false) })
  }, [eventId])

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-navy-light border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="grid grid-cols-[56px_1fr_80px_100px_90px] gap-2 px-4 py-2 text-xs font-head text-text-muted tracking-widest border-b border-white/10 mb-2">
        <span>RANK</span>
        <span>HUNTER</span>
        <span className="text-right">ROUNDS</span>
        <span className="text-right">SCORE</span>
        <span className="text-right">STATUS</span>
      </div>

      <AnimatePresence>
        {entries.map((entry, i) => {
          const isMe = entry.user_id === currentUserId
          const profile = entry.profiles
          const podiumStyle = PODIUM_BG[entry.rank] ?? 'border-white/5'
          const glowStyle = RANK_GLOW[entry.rank] ?? ''

          return (
            <motion.div
              key={entry.user_id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.025, 0.5), duration: 0.3 }}
            >
              <Link
                href={`/profile/${profile?.username ?? entry.user_id}`}
                className={`grid grid-cols-[56px_1fr_80px_100px_90px] gap-2 px-4 py-3 border items-center transition-all cursor-pointer group
                  ${isMe ? 'border-gold/50 bg-gold/8' : podiumStyle}
                  ${glowStyle}
                  hover:border-gold/30 hover:bg-white/3`}
              >
                <RankBadge rank={entry.rank} previousRank={entry.previous_rank} />

                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    emoji={profile?.equipped_avatar ?? '🌍'}
                    border={profile?.equipped_border ?? 'none'}
                    size="xs"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className={`flex items-center gap-1.5 font-head font-bold text-sm truncate group-hover:text-gold transition-colors ${isMe ? 'text-gold' : 'text-white'}`}>
                      <span className="truncate">
                        {profile?.display_name || profile?.username ?? 'Anonymous'}
                        {isMe && <span className="text-xs text-gold/60 ml-1">(you)</span>}
                      </span>
                      {profile?.equipped_badge && (() => {
                        const badge = ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
                        return badge ? (
                          <span className="badge-wrap shrink-0">
                            <span className="text-sm leading-none">{badge.emoji}</span>
                            <span className="badge-tip">{badge.label} — {badge.desc}</span>
                          </span>
                        ) : null
                      })()}
                    </div>
                    {profile?.equipped_title && (
                      <div className="text-xs text-text-muted font-head truncate">{profile.equipped_title}</div>
                    )}
                  </div>
                </div>

                <span className="text-right font-mono text-sm text-text-muted">{entry.challenges_completed}/20</span>

                <span className={`text-right font-mono font-bold text-sm ${entry.rank <= 3 ? 'text-gold' : 'text-white'}`}>
                  {entry.total_score?.toLocaleString()}
                </span>

                <div className="text-right">
                  {entry.challenges_completed === 20
                    ? <span className="text-xs text-success font-head tracking-wider">✓ DONE</span>
                    : <span className="text-xs text-electric font-head">HUNTING</span>}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {entries.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 text-text-muted font-head">
          No hunters on the board yet. Be the first.
        </motion.div>
      )}
    </div>
  )
}
