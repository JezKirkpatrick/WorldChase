'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Step {
  id: string
  label: string
  desc: string
  href: string
  cta: string
  tokens: number
  done: boolean
}

interface Props {
  completedCount: number
  hasAvatar: boolean
  hasLeaderboardRank: boolean
  userId: string
}

export default function OnboardingGuide({ completedCount, hasAvatar, hasLeaderboardRank, userId }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [claimed, setClaimed] = useState<string[]>([])
  const [claiming, setClaiming] = useState(false)
  const [tokensGained, setTokensGained] = useState(0)
  const [visitedShop, setVisitedShop] = useState(false)
  const [visitedLeaderboard, setVisitedLeaderboard] = useState(false)
  const [visitedProfile, setVisitedProfile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const d = localStorage.getItem(`wc_onboarding_dismissed_${userId}`)
      if (d === '1') setDismissed(true)
      const c = localStorage.getItem(`wc_onboarding_claimed_${userId}`)
      if (c) setClaimed(JSON.parse(c))
      if (localStorage.getItem(`wc_visited_shop_${userId}`) === '1') setVisitedShop(true)
      if (localStorage.getItem(`wc_visited_leaderboard_${userId}`) === '1') setVisitedLeaderboard(true)
      if (localStorage.getItem(`wc_visited_profile_${userId}`) === '1') setVisitedProfile(true)
    }
  }, [userId])

  function markVisited(stepId: string) {
    if (stepId === 'avatar') {
      localStorage.setItem(`wc_visited_shop_${userId}`, '1')
      setVisitedShop(true)
    } else if (stepId === 'leaderboard') {
      localStorage.setItem(`wc_visited_leaderboard_${userId}`, '1')
      setVisitedLeaderboard(true)
    } else if (stepId === 'profile') {
      localStorage.setItem(`wc_visited_profile_${userId}`, '1')
      setVisitedProfile(true)
    }
  }

  const steps: Step[] = [
    {
      id: 'avatar',
      label: 'Choose Your Identity',
      desc: 'Visit the shop and equip a custom avatar',
      href: '/shop',
      cta: 'VISIT SHOP',
      tokens: 1,
      done: hasAvatar || visitedShop,
    },
    {
      id: 'first_round',
      label: 'Enter the Hunt',
      desc: 'Complete your very first round',
      href: '/play',
      cta: 'PLAY NOW',
      tokens: 2,
      done: completedCount >= 1,
    },
    {
      id: 'three_rounds',
      label: 'Finding Your Feet',
      desc: 'Complete 3 rounds total',
      href: '/play',
      cta: 'KEEP HUNTING',
      tokens: 2,
      done: completedCount >= 3,
    },
    {
      id: 'leaderboard',
      label: 'Check the Standings',
      desc: 'Visit the global leaderboard',
      href: '/leaderboard',
      cta: 'VIEW LEADERBOARD',
      tokens: 1,
      done: visitedLeaderboard || hasLeaderboardRank,
    },
    {
      id: 'profile',
      label: 'Claim Your Name',
      desc: 'Visit your public profile page',
      href: '/profile',
      cta: 'MY PROFILE',
      tokens: 1,
      done: visitedProfile,
    },
  ]

  const completedSteps = steps.filter(s => s.done)
  const unclaimedDone = completedSteps.filter(s => !claimed.includes(s.id))
  const pendingTokens = unclaimedDone.reduce((sum, s) => sum + s.tokens, 0)
  const allDone = steps.every(s => s.done)

  if (dismissed) return null
  // Only show if there's something to do or unclaimed tokens
  if (allDone && unclaimedDone.length === 0) return null

  async function claimRewards() {
    if (claiming || unclaimedDone.length === 0) return
    setClaiming(true)
    try {
      const res = await fetch('/api/profile/onboarding-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIds: unclaimedDone.map(s => s.id) }),
      })
      if (res.ok) {
        const { tokensEarned } = await res.json()
        const newClaimed = [...claimed, ...unclaimedDone.map(s => s.id)]
        setClaimed(newClaimed)
        localStorage.setItem(`wc_onboarding_claimed_${userId}`, JSON.stringify(newClaimed))
        setTokensGained(tokensEarned ?? pendingTokens)
        router.refresh()
        setTimeout(() => setTokensGained(0), 3000)
      }
    } finally {
      setClaiming(false)
    }
  }

  function dismiss() {
    localStorage.setItem(`wc_onboarding_dismissed_${userId}`, '1')
    setDismissed(true)
  }

  return (
    <div className="mb-5 animate-fade-up" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
      <div className="border border-electric/30 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(15,21,53,1) 60%)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric/0 via-electric/50 to-electric/0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <div>
              <div className="text-xs font-head font-bold text-electric tracking-widest">HUNTER ORIENTATION</div>
              <div className="text-xs text-text-muted font-head">
                {completedSteps.length}/{steps.length} steps complete
                {pendingTokens > 0 && <span className="text-gold ml-2">· {pendingTokens} tokens ready to claim!</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCollapsed(!collapsed)}
              className="text-xs font-head text-text-muted hover:text-white transition-colors px-2 py-1">
              {collapsed ? 'SHOW ▼' : 'HIDE ▲'}
            </button>
            <button onClick={dismiss}
              className="text-xs font-head text-text-muted hover:text-danger transition-colors px-2 py-1">
              ✕
            </button>
          </div>
        </div>

        {/* Steps */}
        {!collapsed && (
          <div className="p-4">
            <div className="space-y-2 mb-4">
              {steps.map((step, i) => (
                <div key={step.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border transition-all ${step.done
                    ? 'border-success/20 bg-success/5'
                    : 'border-white/5 bg-navy/40'
                  }`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 font-mono font-bold text-xs transition-all ${step.done
                    ? 'border-success bg-success/20 text-success'
                    : 'border-white/20 text-text-muted'
                  }`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-head font-bold text-xs ${step.done ? 'text-white line-through opacity-60' : 'text-white'}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-text-muted font-head">{step.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-gold/70">+{step.tokens}🪙</span>
                    {!step.done && (
                      <Link href={step.href}
                        onClick={() => markVisited(step.id)}
                        className="text-xs font-head font-bold text-electric border border-electric/30 px-2 py-1 hover:bg-electric/10 transition-all">
                        {step.cta} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Claim button */}
            {pendingTokens > 0 && (
              <button
                onClick={claimRewards}
                disabled={claiming}
                className="w-full py-3 font-head font-bold text-sm tracking-widest transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #f5c518, #ffd700)', color: '#0a0e27' }}>
                {claiming ? 'CLAIMING...' : `CLAIM ${pendingTokens} TOKENS →`}
              </button>
            )}

            {tokensGained > 0 && (
              <div className="mt-2 text-center text-success font-head font-bold text-sm pop-in">
                +{tokensGained} tokens earned! 🎉
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
