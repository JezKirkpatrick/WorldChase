'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const DISMISSED_KEY = 'wc_push_dismissed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushAutoPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    // Only show if: PWA push supported, permission not decided, not already dismissed
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Show after 4 seconds — let the page settle first
    const t = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { dismiss(); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON()
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      setDone(true)
      setTimeout(() => setVisible(false), 2500)
    } catch {
      dismiss()
    }
    setBusy(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-navy-light border border-gold/40 p-4 shadow-[0_0_40px_rgba(245,197,24,0.12)]">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/50 to-gold/0" />

            {done ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="text-success font-head font-bold text-sm">NOTIFICATIONS ON</div>
                  <div className="text-text-muted font-head text-xs">You'll be alerted when overtaken</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl shrink-0">🔔</span>
                  <div>
                    <div className="text-white font-head font-bold text-sm mb-0.5">STAY IN THE HUNT</div>
                    <div className="text-text-muted font-head text-xs leading-relaxed">
                      Get notified when a rival overtakes you on the leaderboard or a new hunt begins.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={enable}
                    disabled={busy}
                    className="flex-1 py-2 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-50"
                  >
                    {busy ? 'ENABLING...' : 'ENABLE →'}
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-4 py-3 border border-white/20 text-text-muted font-head text-xs hover:text-white hover:border-white/40 transition-colors"
                  >
                    NOT NOW
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
