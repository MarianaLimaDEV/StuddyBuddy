/* StuddyBuddy Service Worker - cache básico */
const CACHE = 'studdybuddy-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/SB_B.png',
        '/SB_W.png',
        '/sfx/ALARM.mp3',
        '/sfx/CLICK.mp3',
        '/sfx/CLOSE.mp3',
        '/sfx/INTERACT.mp3'
      ]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate' && !e.request.url.match(/\.(html|js|css|png|jpg|mp3|woff2?)$/)) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
