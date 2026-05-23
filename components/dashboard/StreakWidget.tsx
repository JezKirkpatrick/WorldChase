'use client'
import { useEffect, useState } from 'react'
import { sounds } from '@/lib/sounds'

interface StreakWidgetProps {
  userId: string
  initialStreak?: number
}

const MILESTONES = [3, 7, 14, 30]

export default function StreakWidget({ userId, initialStreak = 0 }: StreakWidgetProps) {
  const [streak, setStreak] = useState(initialStreak)
  const [bonus, setBonus] = useState(0)
  const [showBonus, setShowBonus] = useState(false)

  useEffect(() => {
    sounds.init()
    fetch('/api/game/daily-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then(r => r.json()).then(data => {
      if (data.streak) setStreak(data.streak)
      if (data.bonus > 0) {
        setBonus(data.bonus)
        setShowBonus(true)
        sounds.levelUp()
        setTimeout(() => setShowBonus(false), 4000)
      }
    })
  }, [userId])

  const nextMilestone = MILESTONES.find(m => m > streak) ?? 30
  const progress = (streak / nextMilestone) * 100

  return (
    <div className="bg-navy-light border border-white/10 p-4 relative overflow-hidden">
      {showBonus && (
        <div className="absolute inset-0 bg-gold/10 flex items-center justify-center z-10 animate-pulse">
          <div className="text-gold font-head font-bold text-lg">+{bonus} TOKENS! 🔥</div>
        </div>
      )}
      <div className="text-xs font-head text-text-muted tracking-widest mb-2">DAILY STREAK</div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-mono font-bold text-white">{streak}</span>
        <span className="text-orange-400 text-xl">🔥</span>
        <span className="text-xs text-text-muted font-head">days</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-orange-400 transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="text-xs text-text-muted font-head">{nextMilestone - streak} days until +{({3:2,7:5,14:8,30:20}[nextMilestone] ?? 5)} bonus tokens</div>
    </div>
  )
}
