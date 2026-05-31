/* Offline service worker for the PWA.
 *
 * Strategy:
 *  - App shell (index.html + hashed JS/CSS/icons): cache-first, so the app
 *    opens with no connection after the first successful visit.
 *  - Navigations: network-first, falling back to the cached shell offline.
 *  - Map tiles + Supabase Storage images: cache-first, so previously seen maps
 *    and screenshots render offline.
 *  - Supabase data API (/rest, /auth): never cached here — the app's local
 *    cache + write queue (offline.js) own data and sync.
 */
const CACHE = 'igt-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isCacheableAsset = (url) =>
  url.origin === self.location.origin ||
  url.hostname.includes('tile.openstreetmap.org') ||
  url.pathname.includes('/storage/v1/object/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let Supabase data/auth requests pass straight through (no SW caching).
  if (url.hostname.endsWith('supabase.co') && !url.pathname.includes('/storage/')) {
    return;
  }

  // Navigations: try the network, fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Everything else: cache-first, then network (and cache it for next time).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && isCacheableAsset(url)) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
