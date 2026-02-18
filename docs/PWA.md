# PWA — Arquitetura e Guia

Documentação da infraestrutura Progressive Web App do StuddyBuddy (TCC): **IndexedDB**, **Cache API avançado**, **offline-first**, **fila de sincronização**, **Background Sync**, **Push API / Web Push** e eventos em background do Service Worker.

---

## 1. Estrutura de ficheiros

```
StuddyBuddy/
├── public/
│   ├── service-worker.js    # SW: precache, runtime, fetch (network-first / stale-while-revalidate), sync, push
│   ├── offline.html
│   └── manifest.json
├── src/js/
│   ├── pwa/
│   │   ├── config.js         # Constantes (cache names, DB, sync tag)
│   │   ├── db.js             # IndexedDB (idb): tasks, dados, pendingSync
│   │   ├── sync.js           # Fila de sincronização + Background Sync (client)
│   │   ├── sw-registration.js
│   │   ├── push.js           # Push API: subscribe, sendSubscriptionToBackend, initPush
│   │   ├── install-prompt.js
│   │   └── native-feel.js
│   ├── db.js                 # Re-export pwa/db.js
│   ├── main.js               # initSWRegistration, initSyncManager, initPushButton, etc.
│   └── tasklist.js           # carregarTasks, addToPendingSync, pwa-synced
├── backend/
│   └── routes/
│       └── push.js           # GET /api/push/vapid-public, POST /api/push/subscribe, POST /api/push/send
├── scripts/
│   └── generate-vapid-keys.js # Gera VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY para .env
└── docs/
    └── PWA.md
```

---

## 2. IndexedDB

- **Ficheiro:** `src/js/pwa/db.js` (biblioteca **idb**).
- **Base:** `studdybuddy-db`, versão 3.
- **Stores:**
  - **tasks** — tarefas (keyPath `_id`); espelho local do MongoDB para leitura offline.
  - **dados** — store genérico (keyPath `_id`) para outros dados.
  - **pendingSync** — fila de operações pendentes (keyPath `syncId` auto-increment, índice `byTimestamp`); cada entrada: `type`, `url`, `body`, `taskId`, `timestamp`.
- **Funções:** `salvarOffline`, `salvarVariosOffline`, `buscarOffline`, `removerOffline`, `addToPendingSync`, `getAllPendingSync`, `removePendingSyncItem`, `clearPendingSync`, **`carregarTasks()`** (network-first + grava em IDB + fallback local).

---

## 3. Cache API avançado

- **Ficheiro:** `public/service-worker.js`.
- **Caches:** `studdybuddy-precache-v2` (shell no install), `studdybuddy-runtime-v2` (dinâmico).
- **Estratégias:**
  - **Navegação:** network-first → grava resposta no runtime cache → em falha usa cache → fallback `/offline.html`.
  - **Estáticos** (js, css, imagens, fontes, `/icons/`, `/sfx/`, `/assets/`, manifest): **stale-while-revalidate** — responde imediatamente com cache se existir e revalida em background; senão faz fetch e guarda.
  - **API** (`/api/*`): sempre rede, sem cache.
- **Precache (install):** `/`, `/index.html`, `/manifest.json`, `/offline.html`, ícones 192 e 512.

---

## 4. Offline-first e fila de sincronização

- **Leitura:** `carregarTasks()` tenta `GET /api/tasks`, grava em IndexedDB e devolve; em falha devolve `buscarOffline('tasks')`.
- **Escrita offline (tasklist):** ao falhar POST/PUT/DELETE, a operação é guardada em `pendingSync` e é chamado `registerBackgroundSync()`. A UI mantém estado optimista; ao voltar rede a fila é processada.
- **Processamento da fila:**
  - **Com clientes abertos:** evento `online` ou mensagem `SYNC_PENDING` do SW → `runFullSync()` na página (processPendingSync + carregarTasks + evento `pwa-synced`).
  - **Sem clientes:** o próprio Service Worker, no evento `sync`, abre IndexedDB, lê `pendingSync`, faz fetch de cada item e remove da fila em sucesso (processamento em background).

---

## 5. Background Sync e eventos em background do SW

- **Registo:** `sync.js` → `registerBackgroundSync()` chama `registration.sync.register('sync-pending')`. Quando a rede volta, o browser dispara o evento `sync` no SW.
- **No SW:** `sync`: se existirem clientes, envia `postMessage({ type: 'SYNC_PENDING' })`; se não existir nenhum, o SW processa a fila sozinho (abre IndexedDB, GET pendingSync, fetch, delete).
- **Outros eventos no SW:** `install` (precache + skipWaiting), `activate` (limpeza de caches + claim), `fetch`, `push`, `notificationclick`, `message` (SKIP_WAITING).

---

## 6. Push API / Web Push

- **Cliente:** `src/js/pwa/push.js`.
  - `getVapidPublicKey()` — GET `/api/push/vapid-public`.
  - `subscribePush(registration)` — PushManager.subscribe com a chave VAPID.
  - `sendSubscriptionToBackend(subscription, authToken)` — POST `/api/push/subscribe`.
  - `requestNotificationPermission()`, `initPush({ getAuthToken })`, `hasActivePushSubscription()`.
- **UI:** em Configurações, botão (id `pushNotifyBtn`) alterna **Ativar/Desativar** e chama `initPush()`/`disablePush()` e envia a subscrição ao backend (opcionalmente com token de auth).
- **Backend:** `backend/routes/push.js`.
  - **GET /api/push/vapid-public** — devolve a chave pública VAPID (variáveis de ambiente).
  - **POST /api/push/subscribe** — body = PushSubscription JSON; guarda no MongoDB (collection PushSubscription).
  - **POST /api/push/unsubscribe** — remove a subscrição (por endpoint).
  - **POST /api/push/send** — envia uma notificação de teste a todas as subscrições guardadas (payload: `title`, `body`, `url`).
- **Chaves VAPID:** `node scripts/generate-vapid-keys.js` e copiar para `.env` como `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.
- **No Service Worker:** eventos `push` (mostra notificação com título/corpo/ícone e `data`) e `notificationclick` (fecha e abre/foca janela em `data.url`).

---

## 7. Onde cada parte fica (resumo)

| Componente | Ficheiro(s) | Função |
|------------|-------------|--------|
| **IndexedDB** | `pwa/db.js` | tasks, dados, pendingSync; CRUD e carregarTasks offline-first. |
| **Cache API** | `public/service-worker.js` | Precache, runtime, network-first (nav), stale-while-revalidate (estáticos). |
| **Fila de sincronização** | `pwa/db.js` (pendingSync) + `pwa/sync.js` | addToPendingSync, processPendingSync, runFullSync. |
| **Background Sync** | SW (sync) + `pwa/sync.js` (registerBackgroundSync) | Com clientes: postMessage; sem clientes: SW processa fila no próprio contexto. |
| **Push API** | `pwa/push.js` + `backend/routes/push.js` + SW (push, notificationclick) | Subscrever, enviar subscrição ao backend, mostrar notificação e abrir URL. |

---

## 8. Fluxo de dados (offline-first)

1. **Carregar tarefas**  
   `carregarTasks()` (em `pwa/db.js`): `fetch('/api/tasks')` → em sucesso guarda em IndexedDB (store `tasks`) e devolve; em falha devolve `getAll('tasks')`.

2. **Escrita online**  
   Tasklist faz POST/PUT/DELETE à API; em sucesso atualiza UI; em falha não reverte (no toggle/delete já aplicou optimistically).

3. **Escrita offline**  
   - **Adicionar:** adiciona à fila `pendingSync` (POST), guarda tarefa em `tasks` com `_id: 'temp-xxx'`, regista Background Sync, mostra notificação.  
   - **Toggle/Delete:** adiciona PUT ou DELETE à fila, atualiza/remove em IndexedDB, regista Background Sync.

4. **Quando volta a haver rede**  
   - Evento `online`: `runFullSync()` → `processPendingSync()` (envia fila à API) → `carregarTasks()` → dispara `pwa-synced`.  
   - Tasklist escuta `pwa-synced` e chama `loadTasksFromApi()` para refrescar a lista.

5. **Background Sync (opcional)**  
   Se o utilizador fechar o separador com operações pendentes, o browser pode disparar o evento `sync` no SW quando a rede voltar; o SW notifica os clientes abertos para processar a fila (ou na próxima abertura, `initSyncManager()` chama `runFullSync()`).

---

## 9. Como testar

### 9.1 Servir em HTTPS ou localhost

O Service Worker e a Cache API só funcionam em contexto seguro (`https://` ou `localhost`).

```bash
npm run dev
# Abrir http://localhost:5173
```

### 9.2 Registo do Service Worker

1. Abrir DevTools → Application (Chrome) ou Storage (Firefox).  
2. Secção **Service Workers**: deve aparecer `service-worker.js` com estado “activated”.  
3. Em **Cache Storage** devem existir `studdybuddy-precache-v2` e `studdybuddy-runtime-v2`.

### 9.3 Offline (página e recursos)

1. Application → Service Workers → marcar **Offline**.  
2. Recarregar a página: deve carregar a partir do cache ou mostrar `offline.html` em navegações sem cache.  
3. Desmarcar Offline e recarregar: volta a funcionar com rede.

### 9.4 IndexedDB e tarefas offline

1. Com rede: abrir a Task List, adicionar/alterar tarefas (devem vir da API e ser guardadas em IDB).  
2. Application → IndexedDB → `studdybuddy-db` → stores `tasks` e `pendingSync`.  
3. Ativar Offline: a lista deve vir de `tasks`; adicionar uma nova tarefa deve mostrar “guardada localmente…” e a tarefa deve aparecer com id `temp-...`.  
4. Desativar Offline: deve correr a sincronização (e evento `pwa-synced`); a lista deve atualizar e a tarefa temporária dar lugar à versão do servidor.

### 9.5 Background Sync (navegadores que suportam)

1. Com rede, abrir a app.  
2. Ativar Offline, adicionar uma tarefa (fica em `pendingSync`).  
3. Desativar Offline com o separador ainda aberto: o SW pode receber `sync` e a página processa a fila; ou ao abrir a app de novo, `initSyncManager()` chama `runFullSync()`.

### 9.6 Atualização do Service Worker

1. Alterar algo em `public/service-worker.js` (por exemplo um comentário) e guardar.  
2. Recarregar a app (ou “Update on reload” em DevTools).  
3. Em Application → Service Workers deve aparecer nova versão; após “skipWaiting” o cliente passa a usar o novo SW.

### 9.7 Web Push

1. Gerar chaves: `node scripts/generate-vapid-keys.js` e adicionar ao `.env`.
2. Reiniciar o backend; em Configurações clicar “🔔 Ativar” e aceitar permissão.
3. Enviar notificação de teste: `POST /api/push/send` com body `{ "title": "Teste", "body": "Olá", "url": "/" }` (ex.: com curl ou Postman). A notificação deve aparecer mesmo com o separador em background ou fechado.

---

## 10. Cara de app nativo — o que foi adicionado

Para o webapp parecer uma app instalada (sem browser chrome):

| Recurso | Onde | Descrição |
|--------|------|-----------|
| **First-paint escuro** | `index.html` (inline style em `<html>`) | Evita flash branco ao abrir a partir do ecrã inicial. |
| **theme-color dinâmico** | `pwa/native-feel.js` + meta em HTML | Barra de estado/notch usa a cor do tema (escuro/claro). |
| **Safe area top** | `main.scss` em `body` | `padding-top: max(…, env(safe-area-inset-top))` para não sobrepor o notch. |
| **Classe .pwa-standalone** | `pwa/native-feel.js` | Adicionada a `<html>` quando a app está instalada; permite esconder o banner de instalação. |
| **Banner "Instalar app"** | `pwa/install-prompt.js` + HTML + SCSS | Usa `beforeinstallprompt`; mostra barra "Instalar StuddyBuddy"; dispensável (localStorage). |
| **Splash (iOS)** | `index.html` (opcional) | `apple-touch-startup-image`; uma resolução de exemplo; ver abaixo para mais. |

### Splash screen no iOS

O iOS mostra uma imagem de arranque ao abrir a app a partir do ecrã inicial. Uma opção é gerar imagens com o logo centrado em fundo `#171922` para as resoluções mais usadas e adicionar:

```html
<link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px)">
<link rel="apple-touch-startup-image" href="/icons/splash-1284x2778.png" media="(device-width: 428px) and (device-height: 926px)">
<!-- etc. -->
```

O primeiro paint já está escuro graças ao `background-color` em `html`, por isso o splash é um refinamento opcional.

---

## 11. Resumo

- **IndexedDB:** `pwa/db.js` — stores tasks, dados, pendingSync; leitura offline-first com `carregarTasks()`.  
- **Cache API:** SW com precache, runtime, network-first (navegação), stale-while-revalidate (estáticos), sem cache para API.  
- **Fila de sincronização:** pendingSync em IDB; processamento na página (online / SYNC_PENDING) ou no próprio SW quando não há clientes.  
- **Background Sync:** tag `sync-pending`; SW trata o evento e ou notifica clientes ou processa a fila sozinho.  
- **Push API:** `pwa/push.js` + backend `/api/push` (vapid-public, subscribe, send); SW mostra notificação e abre URL no click.  
- **Registo:** `main.js` inicia SW, sync manager, install prompt, native feel e botão de notificações.  
- **Cara de nativo:** ver secção 10.
