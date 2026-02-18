/**
 * PWA — Install prompt (Add to Home Screen / Instalar app)
 * Mostra um banner quando o browser dispara beforeinstallprompt e o utilizador ainda não instalou.
 * Em standalone (app já instalado) o banner não é mostrado.
 */

const STORAGE_KEY = 'pwa-install-dismissed';

/** True se a app está a correr em modo standalone (instalada). */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/** Marca que o utilizador dispensou o prompt (não mostrar de novo). */
function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {}
}

/**
 * Inicializa o install prompt: escuta beforeinstallprompt e mostra o banner.
 * Chamar uma vez no arranque (main.js).
 * @param {Object} options - { bannerId?: string, installBtnId?: string, closeBtnId?: string }
 */
export function initInstallPrompt(options = {}) {
  const bannerId = options.bannerId ?? 'pwa-install-banner';
  const installBtnId = options.installBtnId ?? 'pwa-install-btn';
  const closeBtnId = options.closeBtnId ?? 'pwa-install-close';

  if (isStandalone() || wasDismissed()) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById(bannerId);
    if (banner) {
      banner.classList.remove('hidden');
      banner.setAttribute('aria-hidden', 'false');
    }
  });

  const installBtn = document.getElementById(installBtnId);
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDismissed();
      deferredPrompt = null;
      const banner = document.getElementById(bannerId);
      if (banner) {
        banner.classList.add('hidden');
        banner.setAttribute('aria-hidden', 'true');
      }
    });
  }

  const closeBtn = document.getElementById(closeBtnId);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setDismissed();
      const banner = document.getElementById(bannerId);
      if (banner) {
        banner.classList.add('hidden');
        banner.setAttribute('aria-hidden', 'true');
      }
    });
  }
}
