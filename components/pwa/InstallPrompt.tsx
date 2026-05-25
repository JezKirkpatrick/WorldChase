'use client'
import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Already installed as PWA — don't show
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) { setIsStandalone(true); return }

    // User already dismissed
    if (localStorage.getItem('wc_install_dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Android / Chrome: listen for native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show tip after 3 seconds (no beforeinstallprompt on iOS)
    let iosTimer: ReturnType<typeof setTimeout>
    if (ios) {
      iosTimer = setTimeout(() => setShow(true), 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(iosTimer)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('wc_install_dismissed', '1')
    setShow(false)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') { setPrompt(null); setShow(false) }
  }

  if (isStandalone || !show) return null

  // ── iOS: "Add to Home Screen" instruction ────────────────────────
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-light border-t border-gold/40 px-4 py-3 safe-bottom"
           style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start gap-3 max-w-lg mx-auto">
          <span className="text-2xl shrink-0 mt-0.5">📱</span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-head font-bold text-sm">Add World Chase to your Home Screen</div>
            <div className="text-text-muted font-head text-xs mt-1 leading-relaxed">
              Tap <span className="text-gold font-bold">Share</span> at the bottom of your browser,
              then <span className="text-gold font-bold">"Add to Home Screen"</span>
            </div>
          </div>
          <button onClick={dismiss}
            className="text-text-muted hover:text-white transition-colors text-lg shrink-0 px-1 mt-0.5">
            ✕
          </button>
        </div>
      </div>
    )
  }

  // ── Android / Chrome: native install prompt ──────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-light border-t border-gold/40 px-4 py-3"
         style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <span className="text-2xl shrink-0">🌍</span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-head font-bold text-sm">Install World Chase</div>
          <div className="text-text-muted font-head text-xs">Play offline · Full screen · No browser bar</div>
        </div>
        <button onClick={install}
          className="px-4 py-2 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-all shrink-0"
          style={{ boxShadow: '0 0 12px rgba(245,197,24,0.3)' }}>
          INSTALL
        </button>
        <button onClick={dismiss}
          className="text-text-muted hover:text-white transition-colors text-lg shrink-0 px-1">
          ✕
        </button>
      </div>
    </div>
  )
}
