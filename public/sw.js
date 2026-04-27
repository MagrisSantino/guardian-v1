// Guardian PWA — Service Worker
// Estrategia: cache-first para assets estáticos, network-first para páginas y API

const CACHE_VERSION = 'guardian-v1'
const STATIC_CACHE  = `${CACHE_VERSION}-static`
const PAGES_CACHE   = `${CACHE_VERSION}-pages`

// Assets que se cachean en la instalación del SW
const PRECACHE_ASSETS = [
  '/offline',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

// ── Mensaje desde el cliente (ej: SKIP_WAITING para activar nueva versión)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Instalación ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
  )
})

// ── Activación: limpiar caches viejos ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) return

  // ① API routes → siempre red (nunca servir datos desactualizados)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ ok: false, error: 'Sin conexión a internet' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // ② Assets estáticos de Next.js (_next/static) → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // ③ Imágenes y archivos estáticos → cache-first con fallback de red
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|woff2|woff|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          }
          return response
        }).catch(() => cached ?? new Response('', { status: 404 }))
      })
    )
    return
  }

  // ④ Páginas HTML → network-first con fallback a cache y luego /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(PAGES_CACHE).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/offline'))
        )
    )
    return
  }
})
