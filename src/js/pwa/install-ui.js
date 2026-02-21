import { isStandalone, onInstallAvailabilityChange, promptInstall } from './install-prompt.js';
import { showNotification } from '../utils.js';
import { tr } from '../i18n.js';

function isIOS() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+: "Macintosh" + touch
  const iPadOs = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

export function initInstallUI(options = {}) {
  const downloadBtnId = options.downloadBtnId ?? 'pwaDownloadBtn';
  const hintId = options.hintId ?? 'pwaInstallHint';

  const downloadBtn = document.getElementById(downloadBtnId);
  const hint = document.getElementById(hintId);

  const setInstalledState = () => {
    if (downloadBtn) {
      downloadBtn.disabled = true;
    }
    setText(hint, tr('appAlreadyInstalled'));
  };

  const setUnavailableState = () => {
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }
    setText(hint, tr('appInstallHint'));
  };

  const setAvailableState = () => {
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }
    setText(hint, tr('appInstallReady'));
  };

  if (isStandalone()) {
    setInstalledState();
    return;
  }

  // Initial state (before beforeinstallprompt)
  setUnavailableState();

  onInstallAvailabilityChange((available) => {
    if (isStandalone()) return setInstalledState();
    available ? setAvailableState() : setUnavailableState();
  });

  downloadBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const result = await promptInstall({ hideBannerId: 'pwa-install-banner' });
    if (result.available) {
      if (result.outcome === 'accepted') showNotification(tr('appInstalled'), 'success', 3500);
      else if (result.outcome === 'dismissed') showNotification(tr('appInstallDismissed'), 'info', 3500);
      return;
    }

    // Fallback guidance (iOS has no beforeinstallprompt)
    if (isIOS()) showNotification(tr('appInstallIosHint'), 'info', 7000);
    else showNotification(tr('appInstallDesktopHint'), 'info', 7000);
  });
}

