/* eslint-env serviceworker */
/**
 * StuddyBuddy — Service Worker (production-grade PWA)
 *
 * CACHE STRATEGIES:
 * 1. Cache First    — /icons/, /sfx/ (immutable; serve from cache, no network unless missing)
 * 2. Network First  — navigation, GET /api/tasks (try network, cache response, fallback to cache when offline)
 * 3. Stale While Revalidate — JS, CSS, /assets/, manifest (serve cache immediately, revalidate in background)
 *
 * Also: Background Sync (process pending queue with or without open clients), Push notifications.
 */
const CACHE_PRECACHE = 'studdybuddy-precache-v3';
const CACHE_RUNTIME = 'studdybuddy-runtime-v3';
const CACHE_API = 'studdybuddy-api-v1';
const SYNC_TAG_PENDING = 'sync-pending';
const DB_NAME = 'studdybuddy-db';
const DB_VERSION = 3;

const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : `${SCOPE_URL.pathname}/`;
const toBaseUrl = (p) => new URL(String(p || '').replace(/^\//, ''), self.registration.scope).toString();

const PRECACHE_URLS = [
  '',
  'index.html',
  'manifest.json',
  'offline.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
].map(toBaseUrl);

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

async function precacheBuildAssets(cache) {
  // Ensure the app stays interactive offline/standalone:
  // parse index.html and precache /assets/*.js + /assets/*.css (hashed filenames).
  try {
    const indexUrl = toBaseUrl('index.html');
    const res = await fetch(indexUrl, { cache: 'no-cache' });
    if (!res.ok) return;
    const html = await res.text();

    const assetUrls = [];
    const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const raw = m[1];
      if (!raw) continue;
      if (!raw.includes('/assets/')) continue;
      // Only cache build assets (avoid external URLs)
      if (/^https?:\/\//i.test(raw)) continue;
      assetUrls.push(toBaseUrl(raw));
    }

    const urls = unique(assetUrls);
    if (urls.length) await cache.addAll(urls);
  } catch (err) {
    // Best-effort: don't fail SW install if parsing/caching assets fails.
    console.warn('SW precache assets failed', err);
  }
}

// --- Install: precache shell, skipWaiting ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PRECACHE)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_URLS);
        await precacheBuildAssets(cache);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install precache failed', err))
  );
});

// --- Activate: purge old caches, claim ---
self.addEventListener('activate', (event) => {
  const keep = [CACHE_PRECACHE, CACHE_RUNTIME, CACHE_API];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// --- Helpers ---
const url = (req) => new URL(req.url);
const stripBasePath = (pathname) => {
  if (!pathname || pathname === '/') return pathname;
  if (BASE_PATH === '/') return pathname;
  if (pathname.startsWith(BASE_PATH)) {
    const rest = pathname.slice(BASE_PATH.length - 1); // keep leading '/'
    return rest || '/';
  }
  return pathname;
};

function isApiGet(req) {
  if (req.method !== 'GET') return false;
  return stripBasePath(url(req).pathname).startsWith('/api/');
}

function isCacheFirstAsset(req) {
  const path = stripBasePath(url(req).pathname);
  return path.startsWith('/icons/') || path.startsWith('/sfx/');
}

function isStaleWhileRevalidate(req) {
  const path = stripBasePath(url(req).pathname);
  return (
    /\.(js|css)(\?.*)?$/i.test(path) ||
    path.startsWith('/assets/') ||
    path === '/manifest.json'
  );
}

function isNavigation(req) {
  return req.mode === 'navigate';
}

// --- Strategy 1: Cache First (icons, sfx — immutable) ---
function handleCacheFirst(request) {
  return caches.match(request).then((cached) =>
    cached || fetch(request).then((res) => {
      if (res.ok) caches.open(CACHE_RUNTIME).then((c) => c.put(request, res.clone()));
      return res;
    })
  );
}

// --- Strategy 2: Network First (navigation + GET API; cache response, fallback to cache when offline) ---
function handleNetworkFirst(request, useApiCache = false) {
  const cacheName = useApiCache ? CACHE_API : CACHE_RUNTIME;
  return fetch(request)
    .then((res) => {
      const clone = res.clone();
      if (res.ok) caches.open(cacheName).then((c) => c.put(request, clone));
      return res;
    })
    .catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        if (isNavigation(request)) return caches.match(toBaseUrl('offline.html'));
        return null;
      })
    );
}

// --- Strategy 3: Stale While Revalidate (JS, CSS, assets) ---
function handleStaleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const revalidate = () =>
      fetch(request).then((res) => {
        if (res.ok) caches.open(CACHE_RUNTIME).then((c) => c.put(request, res.clone()));
        return res;
      });
    if (cached) {
      revalidate().catch(() => {});
      return cached;
    }
    return revalidate();
  });
}

// --- Fetch: route by request type ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const path = stripBasePath(url(request).pathname);

  // GET /api/tasks — Stale While Revalidate (offline-friendly, Lighthouse-friendly)
  // Avoid caching auth/user-specific API by default.
  if (path === '/api/tasks') {
    event.respondWith(handleStaleWhileRevalidate(request));
    return;
  }

  // Other GET /api/* — Network only (avoid caching sensitive responses)
  if (path.startsWith('/api/')) return;

  if (isNavigation(request)) {
    event.respondWith(handleNetworkFirst(request, false));
    return;
  }

  if (isCacheFirstAsset(request)) {
    event.respondWith(handleCacheFirst(request));
    return;
  }

  if (isStaleWhileRevalidate(request)) {
    event.respondWith(handleStaleWhileRevalidate(request));
    return;
  }

  // Other static (images, fonts, etc.) and any other GET: Stale While Revalidate
  event.respondWith(handleStaleWhileRevalidate(request));
});

// --- Background Sync: process pending queue (with clients → postMessage; without → SW processes in worker) ---
function openIDB() {
  return new Promise((resolve, reject) => {
    const r = self.indexedDB.open(DB_NAME, DB_VERSION);
    
    // Create object stores and indexes if they don't exist
    r.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create tasks store if it doesn't exist
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: '_id' });
      }
      
      // Create dados store if it doesn't exist
      if (!db.objectStoreNames.contains('dados')) {
        db.createObjectStore('dados', { keyPath: '_id' });
      }
      
      // Create pendingSync store if it doesn't exist
      if (!db.objectStoreNames.contains('pendingSync')) {
        const store = db.createObjectStore('pendingSync', { keyPath: 'syncId', autoIncrement: true });
        store.createIndex('byTimestamp', 'timestamp', { unique: false });
      }
    };
    
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingSync', 'readonly');
    const req = tx.objectStore('pendingSync').index('byTimestamp').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deletePending(db, syncId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingSync', 'readwrite');
    tx.objectStore('pendingSync').delete(syncId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function updatePendingRetryCount(db, syncId, retryCount) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingSync', 'readwrite');
    const store = tx.objectStore('pendingSync');
    const getReq = store.get(syncId);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.retryCount = retryCount;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const MAX_RETRY_COUNT = 3;

async function processPendingSyncInSW() {
  const db = await openIDB();
  const pending = await getAllPending(db);
  for (const item of pending) {
    const syncId = item.syncId ?? item.id;
    const retryCount = item.retryCount || 0;
    
    try {
      const headers = new Headers(item.headers || {});
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const options = {
        method: item.type,
        headers,
      };
      if (item.body && (item.type === 'POST' || item.type === 'PUT')) {
        options.body = JSON.stringify(item.body);
      }
      const res = await fetch(item.url, options);
      
      // Remove on success OR non-retriable client errors (4xx)
      if (res.ok) {
        await deletePending(db, syncId);
      } else if (res.status >= 400 && res.status < 500) {
        // Non-retriable: remove from queue
        console.warn(`SW sync: client error ${res.status}, removing item:`, item);
        await deletePending(db, syncId);
      } else if (res.status >= 500 || !res.ok) {
        // Server error or network error - increment retry count
        if (retryCount >= MAX_RETRY_COUNT) {
          console.warn(`SW sync: max retries exceeded, removing item:`, item);
          await deletePending(db, syncId);
        } else {
          await updatePendingRetryCount(db, syncId, retryCount + 1);
        }
      }
    } catch (e) {
      console.warn('SW sync item failed:', item, e);
      // Network error - increment retry count
      if (retryCount >= MAX_RETRY_COUNT) {
        console.warn(`SW sync: max retries exceeded, removing item:`, item);
        await deletePending(db, syncId);
      } else {
        await updatePendingRetryCount(db, syncId, retryCount + 1);
      }
    }
  }
  db.close();
}

self.addEventListener('sync', (event) => {
  if (event.tag !== SYNC_TAG_PENDING) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      if (clients.length > 0) {
        clients.forEach((c) => c.postMessage({ type: 'SYNC_PENDING' }));
      } else {
        await processPendingSyncInSW();
      }
    })
  );
});

// --- Push: show notification, notificationclick opens/focuses window ---
self.addEventListener('push', (event) => {
  let data = { title: 'StuddyBuddy', body: '', data: {} };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || '',
      icon: toBaseUrl('icons/icon-192.png'),
      badge: toBaseUrl('icons/icon-96.png'),
      tag: data.tag || 'default',
      data: data.data || {},
      requireInteraction: !!data.requireInteraction,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = toBaseUrl(event.notification.data?.url || '');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const c = clients[0];
        if (c.navigate) c.navigate(urlToOpen);
        else c.focus();
      } else if (self.clients.openWindow) {
        self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- Message: SKIP_WAITING for update ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
