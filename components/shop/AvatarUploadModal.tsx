'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  userId: string
  onSuccess: (url: string) => void
  onClose: () => void
}

export default function AvatarUploadModal({ userId, onSuccess, onClose }: Props) {
  const [preview, setPreview]   = useState<string | null>(null)
  const [blob, setBlob]         = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
        const SIZE = 400
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')!
        // Crop to square from center
        const s = Math.min(img.width, img.height)
        const sx = (img.width  - s) / 2
        const sy = (img.height - s) / 2
        ctx.drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE)
        canvas.toBlob(b => {
          if (b) { setBlob(b); setPreview(canvas.toDataURL('image/jpeg', 0.9)) }
        }, 'image/jpeg', 0.9)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(f)
  }

  async function upload() {
    if (!blob) return
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const path = `${userId}/avatar.jpg`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the browser shows the new image immediately
      const url = `${publicUrl}?t=${Date.now()}`

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ equipped_avatar: url })
        .eq('id', userId)
      if (profErr) throw profErr

      onSuccess(url)
    } catch (e: any) {
      setError(e.message ?? 'Upload failed — please try again')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-navy-light border border-white/15 p-6 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}>

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #f5c518, #00d4ff, transparent)' }} />

        <div className="flex items-center justify-between mb-5">
          <div className="font-head font-bold text-white text-sm tracking-widest">ULTIMATE AVATAR</div>
          <button onClick={onClose} className="text-text-muted hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Preview circle */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            {preview ? (
              <img src={preview} alt="preview"
                className="w-28 h-28 rounded-full object-cover border-2 border-gold/50 shadow-lg shadow-gold/20" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-navy border-2 border-dashed border-white/20
                flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/40 transition-colors"
                onClick={() => inputRef.current?.click()}>
                <span className="text-3xl">📸</span>
                <span className="text-[10px] font-head text-text-muted">CLICK TO ADD</span>
              </div>
            )}
            {preview && (
              <button onClick={() => inputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-navy-light border border-white/30
                  flex items-center justify-center text-sm hover:border-gold/50 transition-colors">
                ✏️
              </button>
            )}
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/*" onChange={processFile} className="hidden" />

        {!preview && (
          <button onClick={() => inputRef.current?.click()}
            className="w-full py-2.5 mb-3 border border-white/20 text-xs font-head font-bold tracking-widest
              text-text-muted hover:text-white hover:border-white/40 transition-all">
            CHOOSE IMAGE
          </button>
        )}

        {error && (
          <div className="text-danger text-xs font-head text-center mb-3">{error}</div>
        )}

        <button onClick={upload} disabled={!blob || uploading}
          className="w-full py-3 font-head font-bold text-sm tracking-widest transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: blob && !uploading
            ? 'linear-gradient(90deg, #f5c518, #00d4ff)'
            : 'rgba(255,255,255,0.1)',
            color: blob && !uploading ? '#0a0e27' : '#7a7a9a' }}>
          {uploading ? 'UPLOADING…' : 'SAVE AS AVATAR'}
        </button>

        <p className="mt-3 text-center text-[10px] text-text-muted font-head">
          Auto-cropped to square · JPG PNG WebP GIF · Max 8 MB
        </p>
      </div>
    </div>
  )
}
