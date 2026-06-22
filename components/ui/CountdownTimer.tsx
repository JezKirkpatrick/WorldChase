'use client'
import { formatTime } from '@/lib/gameLogic'

interface CountdownTimerProps {
  seconds: number
  speedBonusWindow?: number
}

export default function CountdownTimer({ seconds, speedBonusWindow = 600 }: CountdownTimerProps) {
  const isSpeedWindow = seconds < speedBonusWindow
  const isCritical = seconds < 120

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold ${isCritical ? 'text-danger animate-pulse' : isSpeedWindow ? 'text-success' : 'text-electric'}`}>
      <span className="text-xs text-text-muted">⏱</span>
      <span className="text-xl">{formatTime(seconds)}</span>
      {isSpeedWindow && seconds < speedBonusWindow && (
        <span className="text-xs text-success font-head tracking-wider ml-1">⚡+10%</span>
      )}
    </div>
  )
}
