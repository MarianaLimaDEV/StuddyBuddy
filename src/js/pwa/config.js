/**
 * PWA — Constantes centralizadas
 * Cache names, DB, tags de Background Sync. Alterar versões ao fazer breaking changes.
 */

/** Nome do app (prefixo de caches e DB). */
export const APP_NAME = 'studdybuddy';

/** Cache do shell (HTML, manifest, offline, ícones críticos). Atualizar versão ao mudar lista. */
export const CACHE_PRECACHE = `${APP_NAME}-precache-v2`;

/** Cache dinâmico (assets, páginas visitadas). */
export const CACHE_RUNTIME = `${APP_NAME}-runtime-v2`;

/** Nome da base IndexedDB. */
export const DB_NAME = `${APP_NAME}-db`;

/** Versão do schema IndexedDB. Incrementar em upgrade() ao criar/alterar stores. */
export const DB_VERSION = 3;

/** Tag para Background Sync (filas pendentes). Deve coincidir com o que o SW escuta. */
export const SYNC_TAG_PENDING = 'sync-pending';

/** Lista de URLs a precachear no install do Service Worker (shell). */
export const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
