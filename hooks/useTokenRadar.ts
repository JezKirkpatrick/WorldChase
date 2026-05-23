'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface RadarBlip {
  bearing: number
  distance: number
  intensity: number
}

export function useTokenRadar(
  challengeId: string | null,
  mapCenter: { lat: number; lng: number } | null,
  isActive: boolean
) {
  const [blips, setBlips] = useState<RadarBlip[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<string>('')

  const checkProximity = useCallback(async () => {
    if (!challengeId || !mapCenter || !isActive) return
    const key = `${mapCenter.lat.toFixed(4)},${mapCenter.lng.toFixed(4)}`
    if (key === lastCheckRef.current) return
    lastCheckRef.current = key

    try {
      const res = await fetch('/api/game/check-proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, lat: mapCenter.lat, lng: mapCenter.lng }),
      })
      if (!res.ok) return
      const data = await res.json()
      setBlips(data.blips ?? [])
    } catch {}
  }, [challengeId, mapCenter, isActive])

  useEffect(() => {
    if (!isActive) { setBlips([]); return }
    setIsScanning(true)
    checkProximity()
    intervalRef.current = setInterval(checkProximity, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setIsScanning(false)
    }
  }, [isActive, checkProximity])

  return { blips, isScanning }
}
