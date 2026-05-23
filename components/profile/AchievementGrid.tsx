'use client'
import { useState } from 'react'
import { ACHIEVEMENTS, RARITY_COLOR, RARITY_LABEL } from '@/lib/achievements'
import type { AchievementStats } from '@/lib/achievements'

interface Props {
  stats: AchievementStats
  equippedBadge: string | null
  isMe: boolean
}

export default function AchievementGrid({ stats, equippedBadge, isMe }: Props) {
  const [equipped, setEquipped] = useState(equippedBadge)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const earned = ACHIEVEMENTS.filter(a => a.condition(stats))
  const locked = ACHIEVEMENTS.filter(a => !a.condition(stats))

  async function toggle(id: string) {
    if (!isMe || saving) return
    const next = equipped === id ? null : id
    setSaving(true)
    const res = await fetch('/api/profile/equip-badge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievementId: next }),
    })
    if (res.ok) {
      setEquipped(next)
      setNotification(next ? 'Badge featured!' : 'Badge unequipped')
      setTimeout(() => setNotification(null), 2000)
    }
    setSaving(false)
  }

  return (
    <div>
      {notification && (
        <div className="mb-3 px-3 py-2 bg-gold/10 border border-gold/30 text-gold font-head text-xs text-center pop-in">
          {notification}
        </div>
      )}

      {earned.length === 0 && (
        <div className="text-center py-6 text-text-muted font-head text-sm">
          No achievements yet — complete rounds to earn your first badge!
        </div>
      )}

      {earned.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
          {earned.map(a => {
            const isEquipped = equipped === a.id
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                disabled={!isMe || saving}
                className={`relative flex flex-col items-center gap-1.5 p-2.5 border text-center transition-all group
                  ${isEquipped
                    ? 'border-gold bg-gold/15 shadow-[0_0_16px_rgba(245,197,24,0.25)]'
                    : 'border-gold/20 bg-gold/5 hover:border-gold/50 hover:bg-gold/10 hover:shadow-[0_0_12px_rgba(245,197,24,0.1)]'
                  }
                  ${isMe && !saving ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isEquipped && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-gold rounded-full flex items-center justify-center text-navy text-xs font-bold leading-none z-10">★</div>
                )}
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs font-head font-bold text-gold leading-tight text-center">{a.label}</span>
                <span className={`text-xs border rounded-sm px-1.5 py-0.5 font-head font-bold ${RARITY_COLOR[a.rarity]}`}>
                  {RARITY_LABEL[a.rarity]}
                </span>
                {a.tokenReward > 0 && (
                  <span className="text-xs text-gold/50 font-mono">+{a.tokenReward} 🪙</span>
                )}
                <span className="text-xs text-text-muted font-head leading-tight opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy border border-white/10 px-2 py-0.5 z-20 pointer-events-none">
                  {a.desc}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <div className="divider-gold mb-3" />
          <div className="text-xs font-head text-text-muted tracking-widest mb-2">
            LOCKED — {locked.length} remaining
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {locked.map(a => (
              <div key={a.id}
                className="relative flex flex-col items-center gap-1.5 p-2.5 border border-white/5 text-center opacity-25 group">
                <span className="text-2xl grayscale">{a.emoji}</span>
                <span className="text-xs font-head text-text-muted leading-tight">{a.label}</span>
                <span className="text-xs font-head text-text-muted opacity-60">{RARITY_LABEL[a.rarity]}</span>
                <span className="text-xs text-text-muted font-head leading-tight opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy border border-white/10 px-2 py-0.5 z-20 pointer-events-none">
                  {a.desc}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {isMe && earned.length > 0 && (
        <p className="text-xs text-text-muted font-head mt-4 text-center">
          {equipped
            ? '★ Featured badge shows next to your name everywhere — tap to change'
            : 'Tap any earned badge to feature it next to your name on the leaderboard'}
        </p>
      )}
    </div>
  )
}
