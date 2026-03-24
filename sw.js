/**
 * sw.js — Service Worker for Browser API Playground
 *
 * Provides a simple cache-first offline strategy.
 * Caches the core shell (HTML, CSS, JS) on install,
 * then serves from cache with a network fallback.
 */

const CACHE_NAME = 'browser-api-playground-v1';

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// ─── Lifecycle: Install ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for old SW to be discarded
  self.skipWaiting();
});

// ─── Lifecycle: Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  // Remove outdated caches from previous versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ─── Lifecycle: Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only intercept same-origin GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache; also update cache in background (stale-while-revalidate)
        const networkFetch = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch((err) => {
          // Network unavailable while cache was served — log for diagnostics
          console.debug('[SW] Background revalidation failed:', err);
        });
        return cached;
      }
      // Not in cache — try network, then cache the result
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
