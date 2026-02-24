/**
 * PWA — Gerenciador de sincronização
 * Processa fila pendingSync quando volta online e/ou quando o Service Worker dispara Background Sync.
 */
import {
  getAllPendingSync,
  removePendingSyncItem,
  carregarTasks,
} from './db.js';
import { SYNC_TAG_PENDING } from './config.js';
import { apiFetch } from '../api-base.js';

// Module-level guard to prevent concurrent sync operations
let isSyncing = false;

/**
 * Processa a fila de operações pendentes (POST/PUT/DELETE para /api/tasks).
 * Cada item é enviado à API; em sucesso remove da fila.
 * Handles non-retriable 4xx errors by removing them from the queue.
 */
export async function processPendingSync() {
  const pending = await getAllPendingSync();
  if (pending.length === 0) return;

  for (const item of pending) {
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
      const res = await apiFetch(item.url, options);
      
      // Remove from queue on success OR on non-retriable client errors (4xx)
      if (res.ok) {
        await removePendingSyncItem(item.syncId ?? item.id);
      } else if (res.status >= 400 && res.status < 500) {
        // Non-retriable: 400, 404, 409, 422 - remove from queue and log
        console.warn(`Sync failed with client error ${res.status}, removing item:`, item);
        await removePendingSyncItem(item.syncId ?? item.id);
      }
      // Retry for network errors (will be caught by outer catch) or 5xx server errors
    } catch (e) {
      console.warn('Sync item failed, will retry later:', item, e);
    }
  }
}

/**
 * Chama processPendingSync e depois recarrega dados do servidor (carregarTasks).
 * Dispara evento 'pwa-synced' para a UI atualizar (ex.: tasklist).
 */
export async function runFullSync() {
  // Prevent re-entrancy if sync is already in progress
  if (isSyncing) {
    console.debug('Sync already in progress, skipping');
    return;
  }

  isSyncing = true;
  try {
    await processPendingSync();
    await carregarTasks();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pwa-synced'));
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Regista Background Sync no Service Worker (tag sync-pending).
 * Quando a rede voltar, o SW recebe o evento 'sync' e pode notificar os clientes.
 */
export async function registerBackgroundSync() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  const reg = await navigator.serviceWorker.ready;
  if (!reg.sync || typeof reg.sync.register !== 'function') return;
  try {
    await reg.sync.register(SYNC_TAG_PENDING);
  } catch (e) {
    console.warn('Background Sync register failed:', e);
  }
}

/**
 * Inicializa: escuta 'online' e mensagens do SW para executar runFullSync.
 * Deve ser chamado uma vez no arranque da app (main.js).
 */
export function initSyncManager() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    runFullSync().catch(() => {});
  });

  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_PENDING') {
      runFullSync().catch(() => {});
    }
  });

  // Ao abrir a app com rede: processar fila e refrescar dados (ex.: voltou online com tab fechada)
  if (navigator.onLine) {
    runFullSync().catch(() => {});
  }
}
