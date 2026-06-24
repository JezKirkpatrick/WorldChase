// World Chase Service Worker
const CACHE = 'worldchase-v2'

// Assets to pre-cache on install
const PRECACHE = [
  '/',
  '/dashboard',
  '/how-to-play',
  '/offline',
  '/play',
  '/leaderboard',
  '/chat',
]

// Install: pre-cache shell routes
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  )
})

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'World Chase', body: event.data.text() } }
  const { title = 'World Chase', body = '', url = '/' } = data
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})

// Fetch strategy:
//   - API calls: network-only (never cache)
//   - _next/static: cache-first (immutable hashed assets)
//   - Pages: network-first, fallback to cache, fallback to /offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip non-GET, non-same-origin, and supabase/stripe requests
  if (
    event.request.method !== 'GET' ||
    !url.origin.includes(self.location.origin.split('//')[1]?.split(':')[0] ?? 'worldchase') &&
    !event.request.url.startsWith(self.location.origin)
  ) return

  // API routes — always network-only
  if (url.pathname.startsWith('/api/')) return

  // Hashed static assets (_next/static) — cache-first, never expire
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(event.request, clone))
          return res
        })
      })
    )
    return
  }

  // All other requests — network-first
  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Cache successful HTML/JSON responses
        if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(event.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') return caches.match('/offline')
          return new Response('Offline', { status: 503 })
        })
      )
  )
})
