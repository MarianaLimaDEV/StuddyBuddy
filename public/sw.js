/* StuddyBuddy Service Worker - PWA */
const CACHE_STATIC = 'studdybuddy-static-v2';
const CACHE_RUNTIME = 'studdybuddy-runtime-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sfx/ALARM.mp3',
  '/sfx/CLICK.mp3',
  '/sfx/CLOSE.mp3',
  '/sfx/INTERACT.mp3',
  '/sfx/INTRO.mp3',
  '/sfx/NOTIFICATION.mp3',
  '/sfx/OPEN.mp3',
  '/sfx/RESET.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_RUNTIME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API: always network, no cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigations: network first, fallback cache
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static: cache first, fallback network
  if (/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|mp3|ico)$/.test(url.pathname) ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/sfx/') ||
      url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          const clone = res.clone();
          if (res.ok) caches.open(CACHE_RUNTIME).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // manifest.json
  if (url.pathname === '/manifest.json') {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
