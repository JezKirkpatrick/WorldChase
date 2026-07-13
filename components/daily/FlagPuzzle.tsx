'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
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
  const flagImgRef = useRef<HTMLImageElement | null>(null)
  const sigsRef = useRef<number[][]>([])

  const flagSrc = `https://flagcdn.com/w640/${countryCode.toLowerCase()}.png`

  const draw = useCallback((currentPieces: number[], currentSelected: number | null) => {
    const canvas = canvasRef.current
    const img = flagImgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pw = W / cols
    const ph = H / rows
    const srcW = Math.floor(img.naturalWidth / cols)
    const srcH = Math.floor(img.naturalHeight / rows)

    ctx.clearRect(0, 0, W, H)

    for (let slot = 0; slot < total; slot++) {
      const pieceId = currentPieces[slot]
      const dstC = slot % cols
      const dstR = Math.floor(slot / cols)
      const srcC = pieceId % cols
      const srcR = Math.floor(pieceId / cols)

      // Draw the piece directly from the source image
      ctx.drawImage(img, srcC * srcW, srcR * srcH, srcW, srcH, dstC * pw, dstR * ph, pw, ph)

      // Selection highlight
      if (slot === currentSelected) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.3)'
        ctx.fillRect(dstC * pw, dstR * ph, pw, ph)
        ctx.strokeStyle = 'rgba(212, 175, 55, 1)'
        ctx.lineWidth = 3
        ctx.strokeRect(dstC * pw + 1.5, dstR * ph + 1.5, pw - 3, ph - 3)
      }

      // Grid lines between pieces
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.strokeRect(dstC * pw + 0.5, dstR * ph + 0.5, pw - 1, ph - 1)
    }
  }, [cols, rows, total])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      flagImgRef.current = img
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
      }
      // Pixel signatures for smart solve detection
      const temp = document.createElement('canvas')
      temp.width = img.naturalWidth
      temp.height = img.naturalHeight
      const tCtx = temp.getContext('2d', { willReadFrequently: true })
      if (tCtx) {
        tCtx.drawImage(img, 0, 0)
        const spw = Math.floor(img.naturalWidth / cols)
        const sph = Math.floor(img.naturalHeight / rows)
        const sigs: number[][] = []
        try {
          for (let p = 0; p < total; p++) {
            const data = tCtx.getImageData((p % cols) * spw, Math.floor(p / cols) * sph, spw, sph).data
            const sig: number[] = []
            for (let i = 0; i < data.length; i += 200) sig.push(data[i], data[i + 1], data[i + 2])
            sigs.push(sig)
          }
          sigsRef.current = sigs
        } catch { /* CORS blocked — row fallback used */ }
      }
      draw(pieces, selected)
    }
    img.src = flagSrc
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagSrc])

  // Redraw whenever pieces or selected changes
  useEffect(() => {
    draw(pieces, selected)
  }, [pieces, selected, draw])

  function looksTheSame(a: number, b: number): boolean {
    if (a === b) return true
    const sa = sigsRef.current[a]
    const sb = sigsRef.current[b]
    if (!sa?.length || !sb?.length) return false
    let diff = 0
    for (let i = 0; i < sa.length; i++) diff += Math.abs(sa[i] - sb[i])
    return diff / sa.length < 3
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

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const col = Math.floor(x / (canvas.width / cols))
    const row = Math.floor(y / (canvas.height / rows))
    if (col < 0 || col >= cols || row < 0 || row >= rows) return
    handleClick(row * cols + col)
  }

  return (
    <div className="w-full">
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

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full border border-white/20 cursor-pointer block"
        style={{ aspectRatio: `${cols}/${rows}` }}
        width={cols * 100}
        height={rows * 100}
      />
    </div>
  )
}
