'use client'
import { useState, useRef } from 'react'

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
  // Prevent accidentally pre-solved state
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

  const flagSrc = `https://flagcdn.com/w640/${countryCode.toLowerCase()}.png`

  function pieceStyle(pieceId: number): React.CSSProperties {
    const pc = pieceId % cols
    const pr = Math.floor(pieceId / cols)
    return {
      backgroundImage: `url(${flagSrc})`,
      backgroundSize: `${cols * 100}% ${rows * 100}%`,
      backgroundPosition: `${cols > 1 ? (pc / (cols - 1)) * 100 : 0}% ${rows > 1 ? (pr / (rows - 1)) * 100 : 0}%`,
      backgroundRepeat: 'no-repeat',
    }
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
    if (selected === null) {
      setSelected(slotIdx)
      return
    }
    if (selected === slotIdx) {
      setSelected(null)
      return
    }
    const newPieces = [...pieces]
    ;[newPieces[selected], newPieces[slotIdx]] = [newPieces[slotIdx], newPieces[selected]]
    setPieces(newPieces)
    setSelected(null)
    if (newPieces.every((v, i) => v === i)) {
      handleSolve()
    }
  }

  return (
    <div className="w-full">
      {/* Header: country name only */}
      <div className="mb-4 px-1">
        <div className="text-white font-head font-bold text-xl tracking-wide">{countryName}</div>
        <div className="text-text-muted font-head text-xs mt-0.5">Reconstruct the flag</div>
      </div>

      {/* Instruction */}
      {!solved && (
        <p className="text-text-muted font-head text-xs text-center mb-3">
          Tap a piece to select it <span className="text-gold">●</span> then tap another slot to swap
        </p>
      )}

      {/* Puzzle grid */}
      <div
        className="w-full border border-white/20 relative"
        style={{ aspectRatio: '3 / 2' }}
      >
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
        >
          {pieces.map((pieceId, slotIdx) => (
            <div
              key={slotIdx}
              onClick={() => handleClick(slotIdx)}
              style={pieceStyle(pieceId)}
              className={[
                'cursor-pointer border border-black/20 transition-all duration-150 w-full h-full',
                selected === slotIdx ? 'ring-2 ring-inset ring-gold brightness-75' : 'hover:brightness-110',
                solved && pieceId === slotIdx ? 'ring-1 ring-inset ring-success/40' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>

        {/* Solved overlay */}
        {solved && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-navy/85 backdrop-blur-sm">
            {submitting ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                <div className="text-gold font-head text-sm">Saving...</div>
              </div>
            ) : (
              <div className="text-center px-4">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-gold font-head font-bold text-lg tracking-widest mb-1">FLAG SOLVED!</div>
                {score !== null && (
                  <div className="text-white font-mono font-bold text-2xl">+{score} pts</div>
                )}
                {tokensEarned !== null && (
                  <div className="text-gold font-head text-sm mt-1">+{tokensEarned} 🪙 tokens</div>
                )}
                {error && <div className="text-danger font-head text-xs mt-2">{error}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Piece count hint */}
      {!solved && (
        <p className="text-text-muted font-head text-xs text-center mt-2">
          {pieces.filter((v, i) => v === i).length} / {total} pieces in place
        </p>
      )}
    </div>
  )
}
