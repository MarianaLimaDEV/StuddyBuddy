/**
 * PWA — Comportamento “cara de nativo”
 * Deteta standalone, aplica classe no root, atualiza theme-color conforme o tema.
 */

import { isStandalone } from './install-prompt.js';

const THEME_COLOR_DARK = '#171922';
const THEME_COLOR_LIGHT = '#f0f0f4';
const THEME_COLOR_ACCENT = '#4f7ddf';

/**
 * Aplica classe .pwa-standalone no html quando a app está instalada (sem browser chrome).
 */
function applyStandaloneClass() {
  if (typeof document === 'undefined') return;
  if (isStandalone()) {
    document.documentElement.classList.add('pwa-standalone');
  } else {
    document.documentElement.classList.remove('pwa-standalone');
  }
}

/**
 * Atualiza a meta theme-color conforme data-theme do body (barra de estado / notch).
 */
function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const theme = document.body.getAttribute('data-theme');
  meta.setAttribute('content', theme === 'light' ? THEME_COLOR_LIGHT : THEME_COLOR_DARK);
}

/**
 * Inicializa: standalone class + theme-color e escuta mudanças de tema.
 * Chamar uma vez no arranque (main.js).
 */
export function initNativeFeel() {
  applyStandaloneClass();
  updateThemeColor();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === 'data-theme') updateThemeColor();
    });
  });
  observer.observe(document.body, { attributes: true });
}
