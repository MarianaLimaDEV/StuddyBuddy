/**
 * PWA — Install prompt (Add to Home Screen / Instalar app)
 * Mostra um banner quando o browser dispara beforeinstallprompt e o utilizador ainda não instalou.
 * Em standalone (app já instalado) o banner não é mostrado.
 */

const STORAGE_KEY = 'pwa-install-dismissed';
let deferredPrompt = null;
let isAvailable = false;
const availabilitySubscribers = new Set();

/** True se a app está a correr em modo standalone (instalada). */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function setAvailability(next) {
  isAvailable = Boolean(next);
  availabilitySubscribers.forEach((cb) => {
    try { cb(isAvailable); } catch (_) {}
  });
}

export function getInstallAvailability() {
  return isAvailable;
}

export function onInstallAvailabilityChange(cb) {
  if (typeof cb !== 'function') return () => {};
  availabilitySubscribers.add(cb);
  try { cb(isAvailable); } catch (_) {}
  return () => availabilitySubscribers.delete(cb);
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

function showEl(el) {
  if (!el) return;
  el.classList.remove('hidden');
  el.removeAttribute('hidden');
  el.removeAttribute('inert');
  el.setAttribute('aria-hidden', 'false');
}

function hideEl(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('hidden', '');
  el.setAttribute('inert', '');
}

export async function promptInstall({ hideBannerId } = {}) {
  if (!deferredPrompt) return { available: false, outcome: null };

  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    const outcome = choice?.outcome || null;

    if (outcome === 'accepted') setDismissed();
    deferredPrompt = null;
    setAvailability(false);

    if (hideBannerId) {
      const banner = document.getElementById(hideBannerId);
      hideEl(banner);
    }

    return { available: true, outcome };
  } catch (err) {
    // If something goes wrong, keep availability as-is (best effort).
    return { available: Boolean(deferredPrompt), outcome: null, error: err };
  }
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

  if (typeof window === 'undefined') return;
  if (isStandalone()) return;

  const shouldAutoShowBanner = !wasDismissed();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById(bannerId);
    setAvailability(true);
    if (shouldAutoShowBanner) showEl(banner);
  });

  const installBtn = document.getElementById(installBtnId);
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      await promptInstall({ hideBannerId: bannerId });
    });
  }

  const closeBtn = document.getElementById(closeBtnId);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setDismissed();
      const banner = document.getElementById(bannerId);
      hideEl(banner);
    });
  }

  // If the app gets installed (e.g., via browser UI), hide banner + disable buttons.
  window.addEventListener('appinstalled', () => {
    setDismissed();
    deferredPrompt = null;
    setAvailability(false);
    const banner = document.getElementById(bannerId);
    hideEl(banner);
  });
}
