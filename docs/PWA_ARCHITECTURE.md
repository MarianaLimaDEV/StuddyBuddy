# PWA Architecture — Every Change Explained

This document describes the **full PWA architecture** of StuddyBuddy (GoodNotes-style: full offline, IndexedDB, smart cache, background sync, push, installable) and **explains every change** in one place.

---

## 1. Service Worker — Cache Strategies

**File:** `public/service-worker.js`

The SW implements **three explicit cache strategies** as requested:

### 1.1 Cache First

- **Used for:** `/icons/*`, `/sfx/*` (immutable assets that rarely or never change).
- **Behavior:** Serve from cache immediately. If not in cache, fetch and store in `CACHE_RUNTIME`, then return.
- **Why:** Icons and sound files are versioned by path; no need to revalidate on every request. Fastest for repeat visits.

```js
// In SW: isCacheFirstAsset() → handleCacheFirst(request)
// handleCacheFirst: caches.match(request) || fetch + cache.put
```

### 1.2 Network First

- **Used for:**
  - **Navigation** (HTML): try network, cache response, on failure serve from cache or `/offline.html`.
  - **GET /api/*** (e.g. `/api/tasks`): try network, cache successful response in `CACHE_API`, on failure (e.g. offline) serve from cache.
- **Behavior:** Always try network first. On success, clone response and put in cache. On failure, return cached response if any (for navigation, fallback to `offline.html` if no cache).
- **Why:** Ensures fresh data when online; when offline, last successful API response or last HTML is still available.

```js
// handleNetworkFirst(request, useApiCache)
// useApiCache true → CACHE_API (for GET /api/*), false → CACHE_RUNTIME (navigation)
```

### 1.3 Stale While Revalidate

- **Used for:** JS, CSS, `/assets/*`, `/manifest.json`, and other static assets (images, fonts, etc.) that are not under `/icons/` or `/sfx/`.
- **Behavior:** If cache has a response, return it immediately and in parallel run fetch; if fetch succeeds, update cache. If cache miss, fetch and return (and cache).
- **Why:** Instant load from cache with background refresh so the next request gets fresh content.

```js
// handleStaleWhileRevalidate(request)
// cached ? (revalidate in background, return cached) : fetch + cache
```

### 1.4 What is NOT cached

- **Non-GET requests:** POST, PUT, DELETE pass through to the network (no `respondWith`). Mutations are handled by the **offline queue** (IndexedDB + Background Sync), not by the Cache API.

### 1.5 Cache names

- **CACHE_PRECACHE** (`studdybuddy-precache-v2`): Shell (/, index.html, manifest, offline.html, critical icons). Filled on `install`.
- **CACHE_RUNTIME** (`studdybuddy-runtime-v2`): Dynamic assets (HTML, static files, icons/sfx when using Cache First).
- **CACHE_API** (`studdybuddy-api-v1`): Cached GET API responses (e.g. `/api/tasks`) for offline.

On `activate`, any cache whose name is not in this list is deleted (versioned upgrades).

---

## 2. IndexedDB — Local Database Schema

**File:** `src/js/pwa/db.js` (uses library **idb**).

**Database:** `studdybuddy-db`, **version 3**.

| Store        | KeyPath     | Purpose |
|-------------|-------------|--------|
| **tasks**   | `_id`       | Local copy of tasks from MongoDB. Used for offline read and for optimistic writes (temp ids like `temp-*`). |
| **dados**   | `_id`       | Generic store for other app data (extensible). |
| **pendingSync** | `syncId` (autoIncrement) | Queue of pending write operations. Each record: `type` (POST/PUT/DELETE), `url`, `body`, `taskId`, `timestamp`. Index: `byTimestamp` for ordered processing. |

**Exposed API:**

- **CRUD:** `salvarOffline(storeName, doc)`, `salvarVariosOffline(storeName, array)`, `buscarOffline(storeName)`, `removerOffline(storeName, id)`.
- **Queue:** `addToPendingSync({ type, url, body?, id? })`, `getAllPendingSync()`, `removePendingSyncItem(syncId)`, `clearPendingSync()`.
- **Offline-first loader:** `carregarTasks()` — tries `GET /api/tasks`, on success saves to `tasks` and returns; on failure returns `buscarOffline('tasks')`.

**Sync with backend:** Not “automatic” in the sense of a separate daemon; sync is triggered by:
- **Online event** in the page → `runFullSync()` (process queue + reload tasks).
- **Background Sync** event in the SW → either notifies open clients to run `runFullSync()`, or the SW itself processes the queue (see below).

> ⚠️ **Browser Support:** Background Sync API is only widely supported in Chromium-based browsers (Chrome, Edge) and is **not supported in Firefox or Safari**. Use feature detection (`'sync' in registration`) before calling `registerBackgroundSync()`. Fall back to the window `online` event listener or a manual retry queue when Background Sync is unavailable.

---

## 3. Offline-First Logic

**When offline:**

1. **Reads:** `carregarTasks()` fails the fetch; the Service Worker may still serve a cached GET response for `/api/tasks` if it was cached earlier. The app also uses `buscarOffline('tasks')` as fallback in `carregarTasks()`, so either the cached response is used (and then data can be written to IndexedDB by the same code path) or the IDB store is used.
2. **Writes (tasklist):** On POST/PUT/DELETE failure, the app:
   - Pushes the operation to **pendingSync** via `addToPendingSync({ type, url, body })`.
   - Updates or removes the task in the **tasks** store for immediate UI consistency.
   - Calls **registerBackgroundSync()** so the browser will fire a `sync` event when connectivity returns.

**When online again:**

1. **Window open:** `initSyncManager()` runs on load; it listens for `online` and for `message` from the SW (`SYNC_PENDING`). On `online` (or when the SW sends `SYNC_PENDING`), it runs **runFullSync()**:
   - **processPendingSync()** — for each item in `pendingSync`, perform the HTTP request; on success remove from queue.
   - **carregarTasks()** — refresh tasks from API and update IndexedDB.
   - Dispatch **pwa-synced** so the task list (and any other UI) can re-render from the fresh data.
2. **No window open:** The Service Worker receives the **sync** event (Background Sync). It opens IndexedDB, reads `pendingSync`, and runs the same HTTP requests in the worker; on success it deletes the item from the queue. So pending changes are synced even if the user closed the tab.

**Files:** `src/js/pwa/sync.js` (client), `src/js/pwa/db.js` (IDB + carregarTasks), `public/service-worker.js` (sync handler + optional SW-side queue processing), `src/js/tasklist.js` (uses carregarTasks, addToPendingSync, registerBackgroundSync, listens for pwa-synced).

---

## 4. Push Notification System

### 4.1 Backend (Node + web-push)

**File:** `backend/routes/push.js`.

- **VAPID:** Keys from env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Generate with `node scripts/generate-vapid-keys.js` and add to `.env`.

> ⚠️ **Security Warning:** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` must never be committed to version control. The generated keys should be stored only in environment variables (`.env`) which is excluded by `.gitignore`. Add the variable names to a `.env.example` file (not the actual keys) for maintainers. If keys are ever exposed, rotate them immediately by generating new ones.

- **GET /api/push/vapid-public** — Returns the public key for the client to call `PushManager.subscribe()`.
- **POST /api/push/subscribe** — Accepts a PushSubscription JSON (from the frontend), persists it in MongoDB (collection PushSubscription).
- **POST /api/push/send** — Sends a test notification to all stored subscriptions (body: `title`, `body`, `url`). Uses `webpush.sendNotification(subscription, payload)`.

> ⚠️ **Security:** The `/api/push/send` endpoint validates and whitelists the `data.url` value before accepting/sending notifications. Servers should only allow internal or explicitly trusted URL patterns (e.g., relative paths starting with `/`). External URLs are rejected to prevent the service worker's `notificationclick` handler from redirecting users to untrusted/phishing sites.

Payload format: `JSON.stringify({ title, body, data: { url } })`. The SW receives this in the `push` event and shows a notification; on `notificationclick` it opens/focuses the window to `data.url`.

### 4.2 Frontend subscription flow

**File:** `src/js/pwa/push.js`.

1. **initPush({ getAuthToken })** — Called when the user clicks “Enable notifications” (e.g. in Settings).
2. **requestNotificationPermission()** — Asks for permission if not already granted.
3. **getVapidPublicKey()** — Fetches public key from GET `/api/push/vapid-public`.
4. **subscribePush(registration)** — `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
5. **sendSubscriptionToBackend(subscription, authToken)** — POST the subscription to `/api/push/subscribe` (optional auth header to associate with user).

**File:** `src/js/main.js` — `initPushButton()` wires the Settings button to `initPush()` and updates the button state using `hasActivePushSubscription()`.

### 4.3 Service worker notification handling

**File:** `public/service-worker.js`.

- **push:** Parses `event.data.json()`, then `self.registration.showNotification(title, { body, icon, badge, tag, data, requireInteraction })`.
- **notificationclick:** Closes the notification and focuses an existing window or opens a new one to `event.notification.data.url` (default `/`).

No Firebase is required; the stack is **Web Push (VAPID) + Node web-push**. Firebase Cloud Messaging can be added later if you need FCM-specific features.

> ⚠️ **Browser Support:** Push API is supported in Chrome, Edge, and Firefox but Safari only supports it in recent versions (macOS 13+ Ventura and iOS 16.4+). Before exposing the "Enable notifications" UI, check for service worker and PushManager support (`'serviceWorker' in navigator && 'PushManager' in window`) and show fallback messaging when unsupported.

---

## 5. Manifest — Full Installable Experience

**File:** `public/manifest.json`.

Changes for a **professional, installable** PWA:

- **id:** `"/"` — Uniqueness for the app (avoids conflicts with other PWAs on the same host).
- **description:** Longer, user-facing text describing the app and that it works offline and is installable.
- **display_override:** `["standalone", "minimal-ui", "browser"]` — Prefer standalone, then minimal-ui, then browser. Improves install behavior on supported browsers.
- **prefer_related_applications:** `false` — So the browser does not prefer a native app over the PWA when both exist.
- **categories:** `["productivity", "education", "utilities"]` — Helps stores and “Add to Home Screen” contexts.
- **shortcuts:** Kept Pomodoro and Timer; added **Task List** shortcut for quick access.

**Screenshots:** Left as `[]`. For store listings (e.g. Microsoft Store, Samsung Galaxy Store), add screenshot objects with `form_factor`, `label`, `sizes`, `src`, `type` as per the spec.

Together with **HTTPS**, **valid manifest**, **service worker**, and **icons**, the app is installable as a native-like app (Add to Home Screen / Install app).

---

## 6. File Structure (Reference)

```
StuddyBuddy/
├── public/
│   ├── service-worker.js   # All cache strategies, Background Sync, Push handlers
│   ├── offline.html        # Shown when navigation fails offline
│   └── manifest.json       # Installable PWA manifest
├── src/js/
│   ├── pwa/
│   │   ├── config.js       # Cache/DB names, PRECACHE_URLS, SYNC_TAG_PENDING
│   │   ├── db.js           # IndexedDB (tasks, dados, pendingSync) + carregarTasks
│   │   ├── sync.js         # processPendingSync, runFullSync, registerBackgroundSync, initSyncManager
│   │   ├── push.js         # initPush, subscribe, sendSubscriptionToBackend
│   │   ├── sw-registration.js
│   │   ├── install-prompt.js
│   │   └── native-feel.js
│   ├── db.js               # Re-exports from pwa/db.js
│   ├── main.js             # Inits: SW, sync manager, push button, install prompt, native feel
│   └── tasklist.js         # Uses carregarTasks, addToPendingSync, pwa-synced
├── backend/
│   └── routes/
│       └── push.js         # GET vapid-public, POST subscribe, POST send
├── scripts/
│   └── generate-vapid-keys.js
└── docs/
    ├── PWA.md
    └── PWA_ARCHITECTURE.md # This file
```

---

## 7. Summary Table

| Goal                         | Implementation |
|-----------------------------|----------------|
| Cache First                 | `/icons/`, `/sfx/` in SW → `handleCacheFirst` |
| Network First               | Navigation + GET `/api/*` in SW → `handleNetworkFirst` |
| Stale While Revalidate      | JS, CSS, `/assets/`, manifest, other static → `handleStaleWhileRevalidate` |
| Cache static assets         | Precache (install) + runtime + strategies above |
| Cache dynamic API requests  | GET `/api/*` cached in `CACHE_API` (Network First) |
| IndexedDB schema            | `tasks`, `dados`, `pendingSync` in `pwa/db.js` |
| Sync local ↔ backend        | pendingSync queue + processPendingSync + runFullSync + pwa-synced |
| Offline: store requests     | addToPendingSync in tasklist on write failure |
| Online: sync pending        | online event + SYNC_PENDING message + runFullSync; or SW sync event (no clients) |
| Background sync             | registration.sync.register('sync-pending'); SW handles sync with or without clients |
| Push (Node + web-push)      | backend/routes/push.js (VAPID, subscribe, send) |
| Push frontend               | pwa/push.js (initPush, subscribe, send to backend); Settings button |
| Push in SW                  | push + notificationclick in service-worker.js |
| Installable manifest        | id, display_override, prefer_related_applications, description, shortcuts |

All of the above follows modern PWA best practices and is structured for production use and maintainability.
