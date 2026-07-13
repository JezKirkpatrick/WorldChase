'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  countryCode: string
  countryName: string
  cols: number
  rows: number
  eventId: string | null
}

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (a.every((v, i) => v === i)) return shuffle(arr)
  return a
}

export default function FlagPuzzle({ countryCode, countryName, cols, rows, eventId }: Props) {
  const total = cols * rows
  const [pieces, setPieces] = useState<number[]>(() => shuffle(Array.from({ length: total }, (_, i) => i)))
  const [selected, setSelected] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [tokensEarned, setTokensEarned] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sigsRef = useRef<number[][]>([])

  const flagSrc = `https://flagcdn.com/w640/${countryCode.toLowerCase()}.png`

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      const pw = Math.floor(img.width / cols)
      const ph = Math.floor(img.height / rows)
      try {
        const sigs: number[][] = []
        for (let p = 0; p < total; p++) {
          const data = ctx.getImageData((p % cols) * pw, Math.floor(p / cols) * ph, pw, ph).data
          const sig: number[] = []
          for (let i = 0; i < data.length; i += 200) sig.push(data[i], data[i + 1], data[i + 2])
          sigs.push(sig)
        }
        sigsRef.current = sigs
      } catch {
        // CORS blocked — will fall back to row-match
      }
    }
    img.src = flagSrc
  }, [flagSrc, cols, rows, total])

  function looksTheSame(a: number, b: number): boolean {
    if (a === b) return true
    const sa = sigsRef.current[a], sb = sigsRef.current[b]
    if (!sa || !sb) return false
    let diff = 0
    for (let i = 0; i < sa.length; i++) diff += Math.abs(sa[i] - sb[i])
    return diff / sa.length < 15
  }

  function isSolved(p: number[]): boolean {
    const hasPixels = sigsRef.current.length === total
    return p.every((pieceId, slotIdx) => {
      if (pieceId === slotIdx) return true
      if (hasPixels) return looksTheSame(pieceId, slotIdx)
      return Math.floor(pieceId / cols) === Math.floor(slotIdx / cols)
    })
  }

  async function handleSolve() {
    setSolved(true)
    setSubmitting(true)
    const timeTaken = Math.floor((Date.now() - startRef.current) / 1000)
    try {
      const res = await fetch('/api/daily-flag/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, countryName, timeTaken, eventId }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setScore(data.score)
      setTokensEarned(data.tokensEarned)
    } catch {
      setError('Could not save result — but well done!')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClick(slotIdx: number) {
    if (solved || submitting) return
    if (selected === null) { setSelected(slotIdx); return }
    if (selected === slotIdx) { setSelected(null); return }
    const newPieces = [...pieces]
    ;[newPieces[selected], newPieces[slotIdx]] = [newPieces[slotIdx], newPieces[selected]]
    setPieces(newPieces)
    setSelected(null)
    if (isSolved(newPieces)) handleSolve()
  }

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="hidden" />

      {solved && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy/95 backdrop-blur-sm px-6">
          {submitting ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <div className="text-gold font-head text-sm tracking-widest">SAVING...</div>
            </div>
          ) : (
            <div className="text-center max-w-sm w-full">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-gold font-head font-bold text-2xl tracking-widest mb-2">FLAG SOLVED!</div>
              <div className="text-text-muted font-head text-sm mb-6">{countryName}</div>
              {score !== null && (
                <div className="text-white font-mono font-bold text-4xl mb-1">+{score} pts</div>
              )}
              {tokensEarned !== null && (
                <div className="text-gold font-head text-lg mb-6">+{tokensEarned} 🪙 tokens earned</div>
              )}
              {error && (
                <div className="border border-danger/30 bg-danger/10 text-danger font-head text-sm px-4 py-3 mb-6">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-3 mt-2">
                <Link href="/leaderboard" className="block px-6 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold/80 transition-colors">
                  VIEW LEADERBOARD →
                </Link>
                <Link href="/play" className="block px-6 py-3 border border-white/20 text-text-muted font-head text-sm tracking-widest hover:border-gold/40 hover:text-gold transition-colors">
                  🏆 PLAY THE HUNT
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 px-1">
        <div className="text-white font-head font-bold text-xl tracking-wide">{countryName}</div>
        <div className="text-text-muted font-head text-xs mt-0.5">Reconstruct the flag</div>
      </div>

      <p className="text-text-muted font-head text-xs text-center mb-3">
        Tap a piece to select it <span className="text-gold">●</span> then tap another to swap
      </p>

      <div className="w-full border border-white/20 relative" style={{ aspectRatio: '3 / 2' }}>
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
        >
          {pieces.map((pieceId, slotIdx) => {
            const pc = pieceId % cols
            const pr = Math.floor(pieceId / cols)
            const isSelected = selected === slotIdx
            return (
              <div
                key={slotIdx}
                onClick={() => handleClick(slotIdx)}
                className="relative overflow-hidden cursor-pointer border border-black/20"
              >
                {/* img approach: immune to CORS cache state that breaks CSS backgroundImage */}
                <img
                  src={flagSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: `${cols * 100}%`,
                    height: `${rows * 100}%`,
                    left: `-${pc * 100}%`,
                    top: `-${pr * 100}%`,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    filter: isSelected ? 'brightness(0.65)' : undefined,
                  }}
                />
                {isSelected && (
                  <div className="absolute inset-0 ring-2 ring-inset ring-gold pointer-events-none" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
