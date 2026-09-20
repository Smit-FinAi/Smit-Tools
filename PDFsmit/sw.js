/* ============================================================
   The PDF Factory — service worker
   Offline-first: app shell is pre-cached, CDN libraries are
   cached on first use so every tool keeps working with no
   internet connection at all.
   ============================================================ */
/* Bump this string on EVERY deploy. The fetch handler is cache-first, so
   without a new version returning visitors keep getting the old files. */
const VERSION = 'pdf-factory-v1.0.1';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const SHELL_FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/core.js',
  './js/crypto.js',
  './js/registry.js',
  './js/ui.js',
  './js/tools/organize.js',
  './js/tools/convert.js',
  './js/tools/edit.js',
  './js/tools/secure.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => Promise.allSettled(SHELL_FILES.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigations: network first, fall back to the cached shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy)).catch(() => { });
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else (app files, CDN scripts, fonts, wasm, language data):
  // cache first, then network, and store whatever comes back.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // refresh in the background when we are online
        fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            caches.open(sameOrigin ? SHELL : RUNTIME).then((c) => c.put(req, res)).catch(() => { });
          }
        }).catch(() => { });
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(sameOrigin ? SHELL : RUNTIME).then((c) => c.put(req, copy)).catch(() => { });
        }
        return res;
      }).catch(() => cached);
    })
  );
});
