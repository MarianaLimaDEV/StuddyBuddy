/**
 * PWA — Registo do Service Worker
 * Regista o SW, trata atualizações (opcional: notificar utilizador) e escuta mensagens.
 */
const SW_URL = `${import.meta.env.BASE_URL}service-worker.js`;
const SCOPE = import.meta.env.BASE_URL;

/**
 * Regista o Service Worker e configura listeners de atualização.
 * Chamar uma vez no arranque (main.js).
 */
export function initSWRegistration() {
  if (!('serviceWorker' in navigator)) return;

  // Dev (Vite/HMR): evitar cache do SW atrapalhar SCSS/JS hot reload.
  // Em produção, o SW é essencial.
  if (import.meta?.env?.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    // Best-effort: limpar caches para evitar CSS/JS stale em dev
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
    }
    return;
  }

  navigator.serviceWorker
    .register(SW_URL, { scope: SCOPE })
    .then((registration) => {
      console.info('Service Worker registado', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível; opcional: mostrar "Atualizar agora?"
            if (typeof window.__pwaOnNewVersion === 'function') {
              window.__pwaOnNewVersion();
            }
          }
        });
      });
    })
    .catch((err) => console.warn('Erro no registo do Service Worker', err));

  // Recarregar quando o SW ativo mudar (após skipWaiting)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/**
 * Pede ao SW em espera para ativar (skipWaiting) e assumir controlo.
 * Útil quando mostras "Nova versão disponível" e o utilizador clica "Atualizar".
 * @returns {Promise<boolean>} - true if a waiting worker was found and SKIP_WAITING was posted, false otherwise
 */
export async function skipWaitingAndReload() {
  // Guard against missing Service Worker support
  if (!navigator.serviceWorker) {
    console.warn('Service Workers not supported');
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration(SCOPE);
    if (!reg || !reg.waiting) {
      return false;
    }
    
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  } catch (error) {
    console.error('Error in skipWaitingAndReload:', error);
    throw error;
  }
}
