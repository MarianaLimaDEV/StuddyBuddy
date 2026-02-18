/**
 * Re-exporta módulo IndexedDB da PWA para compatibilidade.
 * Novos usos devem importar de './pwa/db.js'.
 */
export {
  dbPromise,
  salvarOffline,
  getOffline,
  salvarVariosOffline,
  buscarOffline,
  removerOffline,
  addToPendingSync,
  getAllPendingSync,
  removePendingSyncItem,
  clearPendingSync,
  carregarTasks,
} from './pwa/db.js';
