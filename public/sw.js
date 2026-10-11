const CACHE_NAME = 'fieldsense-v1'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip local Ollama endpoint requests
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.port === '11434' || url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Fallback to cache index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      )
    })
  )
})
