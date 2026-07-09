/**
 * CajaPro Service Worker
 * Estrategia:
 *   - Assets estáticos (JS, CSS, imágenes, fuentes) → cache-first
 *   - Supabase API → network-only (datos siempre frescos)
 *   - Navegación (HTML) → network-first con fallback a cache
 */

const CACHE_NAME = 'cajapro-v1'
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
]

// ── Instalación: precachear shell de la app ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// ── Activación: limpiar caches viejas ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estrategia por tipo de recurso ───────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Supabase y otras APIs → siempre red (no cachear datos)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    request.method !== 'GET'
  ) {
    return // deja que el navegador maneje normalmente
  }

  // Assets compilados de Vite (JS/CSS con hash) → cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Imágenes y archivos estáticos → cache-first
  if (/\.(png|svg|ico|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Navegación HTML → network-first, fallback a /index.html cacheado
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }
})
