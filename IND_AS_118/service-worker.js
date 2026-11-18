/**
 * Smit FinStat PRO - Service Worker for 100% Offline PWA Capability
 * Caches all application code, stylesheets, fonts, and local vendor libraries.
 */

const CACHE_NAME = 'smit-finstat-pro-v1.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/xlsx.full.min.js',
  './js/jspdf.umd.min.js',
  './js/jspdf.plugin.autotable.min.js',
  './js/indas118-rules.js',
  './js/importer.js',
  './js/engine.js',
  './js/exporter.js',
  './js/sample-data-embedded.js',
  './js/app.js',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './sample-data/sample_tb_manufacturing_2yr.csv',
  './sample-data/sample_tb_manufacturing_2yr.xlsx',
  './sample-data/sample_tb_nbfc_lending_2yr.csv',
  './sample-data/sample_tb_nbfc_lending_2yr.xlsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // If valid response, clone and save in cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML documents
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
