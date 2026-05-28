'use client'
import { useState, useRef, useEffect } from 'react'

const SHARE_TEXT = 'Come play WorldChase 🌍 — a daily geography hunt. Race to name locations around the globe!'

export default function ShareButton({ className }: { className?: string }) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const url  = typeof window !== 'undefined' ? window.location.origin : ''
  const text = encodeURIComponent(SHARE_TEXT)
  const link = encodeURIComponent(url)

  async function nativeShare() {
    try {
      await navigator.share({ title: 'WorldChase', text: SHARE_TEXT, url })
    } catch { /* cancelled */ }
    setOpen(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link:', url)
    }
    setOpen(false)
  }

  function openUrl(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => isMobile && navigator.share ? nativeShare() : setOpen(o => !o)}
        className={className}
      >
        {copied ? '✓ COPIED!' : '📤 SHARE'}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-navy-light border border-white/15 shadow-xl min-w-[180px] py-1 animate-fade-up"
          style={{ animationDuration: '0.15s' }}>
          <div className="px-3 py-1.5 text-[10px] font-head text-text-muted tracking-widest border-b border-white/8 mb-1">
            SHARE WORLDCHASE
          </div>

          {isMobile && navigator.share && (
            <button onClick={nativeShare}
              className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
              <span>📱</span> More options
            </button>
          )}

          <button onClick={copyLink}
            className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
            <span>🔗</span> Copy link
          </button>

          <button onClick={() => openUrl(`https://twitter.com/intent/tweet?text=${text}&url=${link}`)}
            className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
            <span className="font-bold text-sm">𝕏</span> Post on X
          </button>

          <button onClick={() => openUrl(`https://wa.me/?text=${text}%20${link}`)}
            className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
            <span>💬</span> WhatsApp
          </button>

          <button onClick={() => openUrl(`https://www.reddit.com/submit?url=${link}&title=${text}`)}
            className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
            <span>🤖</span> Reddit
          </button>

          <button onClick={() => openUrl(`mailto:?subject=Play%20WorldChase&body=${text}%20${link}`)}
            className="w-full text-left px-3 py-2 text-xs font-head text-white hover:bg-white/8 transition-colors flex items-center gap-2">
            <span>✉️</span> Email
          </button>
        </div>
      )}
    </div>
  )
}
