'use client'
import { useEffect, useRef } from 'react'
import type { RadarBlip } from '@/hooks/useTokenRadar'

interface HiddenTokenRadarProps {
  blips: { bearing: number; distance: number; intensity: number }[]
  isScanning: boolean
}

export default function HiddenTokenRadar({ blips, isScanning }: HiddenTokenRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const sweepAngle = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    const cx = size / 2, cy = size / 2
    const r = size / 2 - 8

    function draw() {
      ctx.clearRect(0, 0, size, size)

      // Background
      ctx.fillStyle = 'rgba(10,14,39,0.9)'
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill()

      // Rings
      for (const ringR of [r * 0.33, r * 0.66, r]) {
        ctx.strokeStyle = 'rgba(245,197,24,0.2)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke()
      }

      // Cross hairs
      ctx.strokeStyle = 'rgba(245,197,24,0.15)'
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke()

      // Sweep
      if (isScanning) {
        sweepAngle.current = (sweepAngle.current + 0.03) % (Math.PI * 2)
        const sweepGrad = (ctx as any).createConicGradient ? null : null
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(sweepAngle.current)
        const grad = ctx.createLinearGradient(0, 0, r, 0)
        grad.addColorStop(0, 'rgba(245,197,24,0.6)')
        grad.addColorStop(1, 'rgba(245,197,24,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, r, -0.4, 0)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // Blips
      for (const blip of blips) {
        const angle = (blip.bearing - 90) * (Math.PI / 180)
        const dist = Math.min(blip.distance, 500) / 500 * r
        const bx = cx + Math.cos(angle) * dist
        const by = cy + Math.sin(angle) * dist

        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * (blip.intensity > 0.7 ? 0.015 : 0.006))
        ctx.fillStyle = `rgba(245,197,24,${0.6 + pulse * 0.4})`
        ctx.beginPath()
        ctx.arc(bx, by, 4 + pulse * 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Border
      ctx.strokeStyle = 'rgba(245,197,24,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.stroke()

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [blips, isScanning])

  const signalText = blips.length === 0 ? '○ RADAR ACTIVE — SCANNING' :
    blips.some(b => b.intensity > 0.8) ? '⬤ SIGNAL DETECTED — CLOSE RANGE' :
    '◎ SIGNAL DETECTED — IN RANGE'

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={120} height={120} className="block" />
      <div className={`text-xs font-mono text-center ${blips.length > 0 ? 'text-gold animate-pulse' : 'text-text-muted'}`}>
        {signalText}
      </div>
    </div>
  )
}
