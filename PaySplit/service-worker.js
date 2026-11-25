/**
 * PaySplit – service-worker.js
 * Offline-capable App Shell caching strategy
 * Author: Smit Parekh
 */

const CACHE_NAME = 'paysplit-v1.0.0';

// App shell: all files needed to run offline
const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/qrcode.min.js',
  './js/jszip.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* ---- Install: pre-cache the app shell ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* ---- Activate: clean up old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: Cache-first for shell, network-first for external ---- */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and non-http(s)
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // For same-origin requests: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
    );
    return;
  }

  // For cross-origin (Google Fonts, CDNs): network-first with cache fallback
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
