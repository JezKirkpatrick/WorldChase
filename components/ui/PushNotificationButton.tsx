'use client'
import { useState, useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushNotificationButton() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'unsubscribed')
    })
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); setBusy(false); return }

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
      setStatus('subscribed')
    } catch (e) {
      console.error(e)
    }
    setBusy(false)
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (e) {
      console.error(e)
    }
    setBusy(false)
  }

  if (status === 'loading') return null
  if (status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs font-head text-text-muted">
        <span>🔕</span>
        <span>Notifications blocked in browser settings</span>
      </div>
    )
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        className="flex items-center gap-2 text-xs font-head text-success border border-success/30 px-3 py-2 hover:bg-success/10 transition-colors disabled:opacity-50"
      >
        <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
        {busy ? 'UPDATING...' : 'NOTIFICATIONS ON'}
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy}
      className="flex items-center gap-2 text-xs font-head text-electric border border-electric/30 px-3 py-2 hover:bg-electric/10 transition-colors disabled:opacity-50"
    >
      🔔 {busy ? 'ENABLING...' : 'ENABLE NOTIFICATIONS'}
    </button>
  )
}
