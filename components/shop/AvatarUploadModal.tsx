'use client'
import { useState, useRef, useEffect } from 'react'

const CROP_SIZE = 256   // display px of the circular crop preview
const OUTPUT    = 400   // final saved image size

interface Props {
  onSuccess: (url: string) => void
  onClose:   () => void
}

export default function AvatarUploadModal({ onSuccess, onClose }: Props) {
  const [imgSrc,    setImgSrc]    = useState<string | null>(null)
  const [natW,      setNatW]      = useState(0)
  const [natH,      setNatH]      = useState(0)
  const [zoom,      setZoom]      = useState(1)
  const [offset,    setOffset]    = useState({ x: 0, y: 0 })
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const cropRef  = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Derived display values
  const minScale = natW && natH ? CROP_SIZE / Math.min(natW, natH) : 1
  const scale    = minScale * zoom
  const dW       = natW * scale
  const dH       = natH * scale
  const maxOX    = Math.max(0, (dW - CROP_SIZE) / 2)
  const maxOY    = Math.max(0, (dH - CROP_SIZE) / 2)
  const cx       = Math.max(-maxOX, Math.min(maxOX, offset.x))
  const cy       = Math.max(-maxOY, Math.min(maxOY, offset.y))

  // Attach non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = cropRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      setZoom(z => Math.max(1, Math.min(3, z - e.deltaY * 0.005)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [imgSrc])

  function processFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (f.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        setNatW(img.width)
        setNatH(img.height)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setImgSrc(ev.target?.result as string)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  // ── Drag ──────────────────────────────────────────────────────────
  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { x: clientX, y: clientY, ox: offset.x, oy: offset.y }
  }
  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current) return
    setOffset({
      x: dragRef.current.ox + clientX - dragRef.current.x,
      y: dragRef.current.oy + clientY - dragRef.current.y,
    })
  }
  function endDrag() { dragRef.current = null }

  // ── Upload ────────────────────────────────────────────────────────
  async function upload() {
    if (!imgSrc) return
    setUploading(true)
    setError('')
    try {
      const img = new Image()
      img.src = imgSrc
      await new Promise<void>(resolve => { img.onload = () => resolve() })

      const canvas = document.createElement('canvas')
      canvas.width  = OUTPUT
      canvas.height = OUTPUT
      const ctx = canvas.getContext('2d')!

      // Circular clip
      ctx.beginPath()
      ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2)
      ctx.clip()

      // Map visible crop window → output canvas
      const imgLeft = CROP_SIZE / 2 - dW / 2 + cx
      const imgTop  = CROP_SIZE / 2 - dH / 2 + cy
      const srcX    = -imgLeft / scale
      const srcY    = -imgTop  / scale
      const srcW    = CROP_SIZE / scale
      const srcH    = CROP_SIZE / scale
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT, OUTPUT)

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (!blob) throw new Error('Failed to process image')

      const formData = new FormData()
      formData.append('file', blob, 'avatar.jpg')
      const res  = await fetch('/api/avatar/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onSuccess(data.url)
    } catch (e: any) {
      setError(e.message ?? 'Upload failed — please try again')
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-light border border-white/15 p-6 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}>

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #f5c518, #00d4ff, transparent)' }} />

        <div className="flex items-center justify-between mb-5">
          <div className="font-head font-bold text-white text-sm tracking-widest">ULTIMATE AVATAR</div>
          <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none">✕</button>
        </div>

        {!imgSrc ? (
          /* ── Step 1: Pick image ── */
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-40 h-40 rounded-full border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-gold/50 transition-colors"
              onClick={() => inputRef.current?.click()}>
              <span className="text-4xl">📸</span>
              <span className="text-[10px] font-head text-text-muted tracking-widest">CLICK TO CHOOSE</span>
            </div>
            <button onClick={() => inputRef.current?.click()}
              className="w-full py-2.5 border border-white/20 text-xs font-head font-bold tracking-widest text-text-muted hover:text-white hover:border-white/40 transition-all">
              CHOOSE IMAGE
            </button>
            {error && <div className="text-danger text-xs font-head text-center">{error}</div>}
            <p className="text-center text-[10px] text-text-muted font-head">JPG · PNG · WebP · GIF &nbsp;·&nbsp; Max 8 MB</p>
          </div>
        ) : (
          /* ── Step 2: Crop & adjust ── */
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-head text-text-muted tracking-wider text-center">
              DRAG TO REPOSITION &nbsp;·&nbsp; SCROLL / SLIDER TO ZOOM
            </p>

            {/* Circular crop window */}
            <div
              ref={cropRef}
              className="rounded-full overflow-hidden relative bg-black/60 cursor-grab active:cursor-grabbing select-none shrink-0"
              style={{ width: CROP_SIZE, height: CROP_SIZE, touchAction: 'none' }}
              onMouseDown={e => startDrag(e.clientX, e.clientY)}
              onMouseMove={e => moveDrag(e.clientX, e.clientY)}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onTouchStart={e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY) }}
              onTouchMove={e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY) }}
              onTouchEnd={endDrag}
            >
              {/* Guide ring */}
              <div className="absolute inset-0 rounded-full ring-2 ring-white/25 pointer-events-none z-10" />
              <img
                src={imgSrc}
                alt="crop"
                draggable={false}
                style={{
                  position:      'absolute',
                  width:          dW,
                  height:         dH,
                  left:           CROP_SIZE / 2 - dW / 2 + cx,
                  top:            CROP_SIZE / 2 - dH / 2 + cy,
                  pointerEvents: 'none',
                  userSelect:    'none',
                }}
              />
            </div>

            {/* Zoom slider */}
            <div className="w-full flex items-center gap-3">
              <span className="text-base leading-none">🔍</span>
              <input
                type="range" min={100} max={300} step={1}
                value={Math.round(zoom * 100)}
                onChange={e => { setZoom(Number(e.target.value) / 100); setOffset(o => o) }}
                className="flex-1 accent-gold cursor-pointer"
                style={{ height: 4 }}
              />
              <span className="text-[11px] font-mono text-text-muted w-9 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {error && <div className="text-danger text-xs font-head text-center w-full">{error}</div>}

            {/* Actions */}
            <div className="w-full flex gap-2">
              <button
                onClick={() => { setImgSrc(null); setTimeout(() => inputRef.current?.click(), 50) }}
                className="flex-1 py-2.5 border border-white/20 text-xs font-head text-text-muted hover:text-white hover:border-white/40 transition-all">
                CHANGE
              </button>
              <button
                onClick={upload}
                disabled={uploading}
                className="flex-[2] py-2.5 font-head font-bold text-sm tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: uploading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(90deg, #f5c518, #00d4ff)',
                  color:      uploading ? '#7a7a9a' : '#0a0e27',
                }}>
                {uploading ? 'UPLOADING…' : 'SAVE AVATAR'}
              </button>
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={processFile} className="hidden" />
      </div>
    </div>
  )
}
