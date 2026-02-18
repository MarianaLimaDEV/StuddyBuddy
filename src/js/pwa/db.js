/**
 * PWA — IndexedDB (idb)
 * Persistência local: tasks (dados do Mongo) e pendingSync (fila para Background Sync).
 */
import { openDB } from 'idb';
import { DB_NAME, DB_VERSION } from './config.js';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion) {
    if (!db.objectStoreNames.contains('tasks')) {
      db.createObjectStore('tasks', { keyPath: '_id' });
    }
    if (!db.objectStoreNames.contains('dados')) {
      db.createObjectStore('dados', { keyPath: '_id' });
    }
    // Store para fila de operações pendentes (sync quando voltar online)
    if (!db.objectStoreNames.contains('pendingSync')) {
      const store = db.createObjectStore('pendingSync', { keyPath: 'syncId', autoIncrement: true });
      store.createIndex('byTimestamp', 'timestamp', { unique: false });
    }
  },
});

// --- CRUD genérico ---

/** Salvar um documento no store (put). */
export async function salvarOffline(storeName, dado) {
  const db = await dbPromise;
  return db.put(storeName, dado);
}

/** Buscar um documento por chave. */
export async function getOffline(storeName, key) {
  const db = await dbPromise;
  return db.get(storeName, key);
}

/** Salvar vários documentos numa transação. */
export async function salvarVariosOffline(storeName, dados) {
  if (!dados || dados.length === 0) return;
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all([...dados.map((d) => tx.store.put(d)), tx.done]);
}

/**
 * Substitui o conteúdo de um store (clear + put).
 * Útil quando o store representa um "espelho" do servidor (ex.: tasks),
 * removendo itens temporários (temp-*) e entradas antigas.
 */
export async function replaceOffline(storeName, dados) {
  const list = Array.isArray(dados) ? dados : [];
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  for (const item of list) {
    await tx.store.put(item);
  }
  await tx.done;
}

/** Buscar todos os documentos de um store. */
export async function buscarOffline(storeName) {
  const db = await dbPromise;
  return db.getAll(storeName);
}

/** Remover um documento por chave. */
export async function removerOffline(storeName, id) {
  const db = await dbPromise;
  return db.delete(storeName, id);
}

// --- Fila de sincronização (pendingSync) ---

/**
 * Adicionar operação à fila (POST/PUT/DELETE para API).
 * @param {Object} op - { type: 'POST'|'PUT'|'DELETE', url, body?, headers?, id? }
 */
export async function addToPendingSync(op) {
  const db = await dbPromise;
  await db.add('pendingSync', {
    type: op.type,
    url: op.url,
    body: op.body ?? null,
    taskId: op.id ?? null,
    headers: op.headers ?? null,
    timestamp: Date.now(),
  });
}

/** Obter todas as operações pendentes (ordem por timestamp). */
export async function getAllPendingSync() {
  const db = await dbPromise;
  const list = await db.getAllFromIndex('pendingSync', 'byTimestamp');
  return list;
}

/** Remover um item da fila por key (syncId auto-incrementado). */
export async function removePendingSyncItem(syncId) {
  const db = await dbPromise;
  return db.delete('pendingSync', syncId);
}

/** Limpar toda a fila (após sync bem-sucedido). */
export async function clearPendingSync() {
  const db = await dbPromise;
  const tx = db.transaction('pendingSync', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// --- Estratégia offline-first: network-first + fallback local ---

/**
 * Carrega tarefas: tenta API com timeout, guarda no IndexedDB, em falha usa cache local.
 */
export async function carregarTasks() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const res = await fetch('/api/tasks', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    const list = Array.isArray(dados) ? dados : [];
    // Espelha o servidor (remove temp-* e entradas antigas)
    await replaceOffline('tasks', list);
    return list;
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('carregarTasks fetch failed:', e);
    return await buscarOffline('tasks');
  }
}

export { dbPromise };
