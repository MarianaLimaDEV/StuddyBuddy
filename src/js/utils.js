/**
 * Utility Functions Module
 * Shared utilities for drag functionality and UI interactions
 */
import { playSound } from './sound.js';

// ==================== AUTH / USER SETTINGS (MongoDB) ====================
const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const USER_EMAIL_STORAGE_KEY = 'userEmail';

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (!token) localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    else localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function getStoredUserEmail() {
  try {
    return localStorage.getItem(USER_EMAIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function formatUserLabel(email) {
  const value = String(email || '').trim();
  if (!value) return 'Conta';
  const beforeAt = value.split('@')[0];
  return beforeAt || value;
}

export function setStoredUserEmail(email) {
  try {
    if (!email) localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    else localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
  } catch {
    // ignore
  }
}

export function clearAuth() {
  setAuthToken(null);
  setStoredUserEmail(null);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Token expirado/ inválido: limpa estado local para evitar loops
    clearAuth();
  }
  return res;
}

export async function loginUser({ email, password, rememberMe }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!normalizedEmail) throw new Error('Email é obrigatório');
  if (!pwd) throw new Error('Password é obrigatória');

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password: pwd, rememberMe: Boolean(rememberMe) }),
  });

  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await res.json();
  if (!data?.token) throw new Error('Resposta de login inválida (token em falta)');
  setAuthToken(data.token);
  setStoredUserEmail(data?.user?.email || normalizedEmail);
  return data;
}

export async function registerUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!normalizedEmail) throw new Error('Email é obrigatório');
  if (!pwd || pwd.length < 8) throw new Error('Password deve ter pelo menos 8 caracteres');

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password: pwd }),
  });

  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await res.json();
  if (!data?.token) throw new Error('Resposta de registo inválida (token em falta)');
  setAuthToken(data.token);
  setStoredUserEmail(data?.user?.email || normalizedEmail);
  return data;
}

export async function loginOrRegister({ email, password, rememberMe }) {
  try {
    return await loginUser({ email, password, rememberMe });
  } catch (err) {
    // Backwards-compatible behavior: if login fails with 401, try register
    if (String(err?.message || '').includes('401')) {
      return await registerUser({ email, password });
    }
    throw err;
  }
}

export async function fetchUserSettings() {
  const res = await authFetch('/api/user/settings');
  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return await res.json();
}

export async function updateUserSettings(partial) {
  const res = await authFetch('/api/user/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial || {}),
  });
  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return await res.json();
}

// ==================== COOKIE CONSENT ====================
const COOKIE_CONSENT_KEY = 'cookieConsent';

export function getCookieConsent() {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY); // 'accepted' | 'rejected' | null
  } catch {
    return null;
  }
}

export function setCookieConsent(value) {
  try {
    if (!value) localStorage.removeItem(COOKIE_CONSENT_KEY);
    else localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

export function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('cookieAccept');
  const rejectBtn = document.getElementById('cookieReject');

  if (!banner || !acceptBtn || !rejectBtn) return;

  const show = () => {
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
    // Non-blocking dialog: focus primary action for keyboard users
    acceptBtn.focus();
  };

  const hide = () => {
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  };

  const existing = getCookieConsent();
  if (!existing) show();
  else hide();

  acceptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setCookieConsent('accepted');
    hide();
  });

  rejectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setCookieConsent('rejected');
    hide();
  });
}

// ==================== A11Y HELPERS ====================
function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',')
    )
  ).filter(el => {
    // Basic visibility check (avoid focusing hidden elements)
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

function setExpanded(el, expanded) {
  if (!el) return;
  el.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function setAriaHidden(el, hidden) {
  if (!el) return;
  el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

// ==================== GLOBAL CLICK SOUND ====================
// Add click2 sound to ALL mouse clicks (except on specific elements)
let globalClickHandler = null;
let globalInputFocusHandler = null;

export function initGlobalClickSound() {
  // Remove existing handler if any
  if (globalClickHandler) {
    document.removeEventListener('click', globalClickHandler);
  }

  // Create new handler
  globalClickHandler = (e) => {
    // Don't play sound on these elements (they have their own sounds or shouldn't play sounds)
    if (
      e.target.closest('.card-close') ||  // Has close sound
      e.target.closest('.dropdown-close') ||  // Has close sound
      e.target.closest('.login-popup-close') ||  // Has close sound
      e.target.closest('#muteToggle') ||  // Has mute_toggle sound
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('select')
    ) {
      // These elements play their own specific sounds or shouldn't play sounds
      return;
    }

    // Play click sound on any mouse click (including buttons, links, etc.)
    playSound('click');
  };

  // Add to document
  document.addEventListener('click', globalClickHandler, { passive: true });
  console.info('🔊 Global click sound initialized (CLICK.mp3 on all clicks)');
}

// Note: initGlobalClickSound() is called from main.js AFTER the opening sound plays
// This prevents overlap between the opening sound and click sounds

// ==================== GLOBAL INPUT FOCUS SOUND ====================
// Play "interact" whenever the user is prompted for input (focus enters a field)
export function initGlobalInputFocusSound() {
  if (globalInputFocusHandler) {
    document.removeEventListener('focusin', globalInputFocusHandler);
  }

  const isTextLikeInput = (el) => {
    if (!el) return false;
    if (el.disabled) return false;
    // readonly inputs are still "input prompts" sometimes, but usually shouldn't beep
    if (el.readOnly) return false;

    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;

    const t = (el.getAttribute('type') || 'text').toLowerCase();
    // Exclude non-prompt types
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'hidden'].includes(t);
  };

  globalInputFocusHandler = (e) => {
    const target = e.target;
    if (isTextLikeInput(target)) {
      playSound('interact');
    }
  };

  // focusin bubbles, so we can attach once to document
  document.addEventListener('focusin', globalInputFocusHandler, { passive: true });
  console.info('🔊 Global input focus sound initialized (INTERACT on focus)');
}

// ==================== DRAG FUNCTIONALITY ====================
let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;
let isDragging = false;
const DRAG_THRESHOLD = 5; // pixels - minimum movement to start dragging

// Keep cards stacked: last interacted card comes to front (below navbar/login)
const CARD_Z_BASE = 900;
const CARD_Z_MAX = 995; // keep below navbar dropdowns (1000+) and login (2000)
let currentCardZ = CARD_Z_BASE;

function bringCardToFront(card) {
  if (!card) return;
  currentCardZ += 1;
  if (currentCardZ > CARD_Z_MAX) {
    // Rebase z-indexes for visible cards to avoid overflowing above navbar
    currentCardZ = CARD_Z_BASE;
    const openCards = Array.from(document.querySelectorAll('.card:not(.hidden)'));
    openCards.forEach((c) => {
      currentCardZ += 1;
      c.style.zIndex = String(currentCardZ);
    });
  }
  card.style.zIndex = String(currentCardZ);
}

export function initDragFunctionality() {
  document.querySelectorAll('.card').forEach(card => {
    // Any interaction should bring the card to the front
    card.addEventListener('pointerdown', () => bringCardToFront(card), { passive: true });
    card.addEventListener('focusin', () => bringCardToFront(card), { passive: true });

    card.addEventListener('pointerdown', (e) => {
      // Don't start drag if clicking on interactive elements
      if (
        e.target.closest('.card-close') || 
        e.target.closest('button') ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.closest('input') ||
        e.target.closest('textarea') ||
        e.target.closest('select')
      ) return;
      
      activeCard = card;
      bringCardToFront(card);
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = card.offsetLeft;
      initialTop = card.offsetTop;
      isDragging = false;
      e.preventDefault();
      document.body.style.userSelect = 'none';
      if (e.pointerId && card.setPointerCapture) {
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      document.addEventListener('pointermove', pointerMove);
      document.addEventListener('pointerup', pointerUp);
    });
  });
}

function pointerMove(e){
    if (!activeCard) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Only start dragging after moving a few pixels
    if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      isDragging = true;
    }
    
    if (isDragging) {
      activeCard.style.left = (initialLeft + dx) + 'px';
      activeCard.style.top = (initialTop + dy) + 'px';
    }
}

function pointerUp(e){
    if (!activeCard) return;
    if (e.pointerId && activeCard.releasePointerCapture) {
      try { activeCard.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    activeCard = null;
    isDragging = false;
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('pointerup', pointerUp);
    document.body.style.userSelect = '';
}

// ==================== MOBILE NAVBAR TOGGLE ====================
export function initNavbarToggle() {
  const toggle = document.querySelector('.navbar-toggle');
  const menu = document.getElementById('navbar-menu') || document.querySelector('.navbar-menu');
  if (!toggle || !menu) return;

  setExpanded(toggle, false);
  setAriaHidden(menu, true);

  const openMenu = () => {
    menu.classList.add('open');
    toggle.classList.add('is-open');
    setAriaHidden(menu, false);
    setExpanded(toggle, true);
    const focusables = getFocusableElements(menu);
    if (focusables[0]) focusables[0].focus();
  };

  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.classList.remove('is-open');
    setAriaHidden(menu, true);
    setExpanded(toggle, false);
    toggle.focus();
  };

  toggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  document.addEventListener('click', (ev) => {
    if (!menu.contains(ev.target) && !toggle.contains(ev.target) && menu.classList.contains('open')) closeMenu();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && menu.classList.contains('open')) closeMenu();
  });
}

// ==================== REUSABLE TOGGLE SETUP ====================
export function setupToggle(buttonId, cardId) {
  const button = document.getElementById(buttonId);
  const card = document.getElementById(cardId);
  if (!button || !card) return;

  // Initialize ARIA from initial DOM state
  const isInitiallyOpen = !card.classList.contains('hidden');
  button.setAttribute('aria-pressed', isInitiallyOpen ? 'true' : 'false');
  setAriaHidden(card, !isInitiallyOpen);

  const openCard = () => {
    button.classList.add('pressed');
    button.setAttribute('aria-pressed', 'true');
    card.classList.remove('hidden');
    setAriaHidden(card, false);
    playSound('open');

    // Focus first meaningful element inside the dialog (close button first)
    const closeBtn = card.querySelector('.card-close');
    if (closeBtn) closeBtn.focus();
    else {
      const focusables = getFocusableElements(card);
      if (focusables[0]) focusables[0].focus();
    }
  };

  const closeCard = ({ returnFocus = true } = {}) => {
    button.classList.remove('pressed');
    button.setAttribute('aria-pressed', 'false');
    card.classList.add('hidden');
    setAriaHidden(card, true);
    if (returnFocus) button.focus();
  };

  button.addEventListener('click', () => {
    const isOpen = !card.classList.contains('hidden');
    isOpen ? closeCard({ returnFocus: false }) : openCard();
  });

  // Close card when clicking the close button
  const closeBtn = card.querySelector('.card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('close');
      closeCard({ returnFocus: true });
    });
  }

  // Note: We removed the document click listener that closed cards when clicking outside.
  // This allows multiple cards to be open simultaneously.
}

// ==================== LOGIN POPUP ====================
export function setupLoginPopup() {
  const loginButton = document.getElementById('loginButton');
  const loginPopup = document.getElementById('loginPopup');
  const loginPopupClose = document.getElementById('loginPopupClose');
  const loginForm = document.getElementById('loginForm');
  const loginFormView = document.getElementById('loginFormView');
  const loginConnectedView = document.getElementById('loginConnectedView');
  const loginConnectedMessage = document.getElementById('loginConnectedMessage');
  const loginConnectedOk = document.getElementById('loginConnectedOk');
  const signOutBtn = document.getElementById('signOutBtn');
  const passwordInput = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordConfirmInput = document.getElementById('loginPasswordConfirm');
  const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
  const togglePasswordConfirmBtn = document.getElementById('togglePasswordConfirm');
  const rememberMe = document.getElementById('rememberMe');
  const loginOptions = loginPopup.querySelector('.login-options');
  const loginTitle = document.getElementById('login-title');
  const loginSubtitle = document.getElementById('loginSubtitle');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');

  if (!loginButton || !loginPopup) return;

  let isPopupOpen = false;
  let lastFocusedElement = null;
  let authMode = 'login'; // 'login' | 'signup'

  const setAuthMode = (mode) => {
    authMode = mode === 'signup' ? 'signup' : 'login';

    const isSignup = authMode === 'signup';
    if (tabLogin) {
      tabLogin.classList.toggle('is-active', !isSignup);
      tabLogin.setAttribute('aria-selected', isSignup ? 'false' : 'true');
    }
    if (tabSignup) {
      tabSignup.classList.toggle('is-active', isSignup);
      tabSignup.setAttribute('aria-selected', isSignup ? 'true' : 'false');
    }

    if (confirmPasswordGroup) confirmPasswordGroup.classList.toggle('hidden', !isSignup);
    if (loginOptions) loginOptions.classList.toggle('hidden', isSignup); // remember/forgot only for login

    if (loginTitle) loginTitle.textContent = isSignup ? 'Criar conta' : 'Entrar';
    if (loginSubtitle) {
      loginSubtitle.textContent = isSignup
        ? 'Crie sua conta para sincronizar tema e som.'
        : 'Acesse sua conta para sincronizar suas configurações.';
    }
    if (submitBtn) submitBtn.textContent = isSignup ? 'Criar conta' : 'Entrar';

    // Autocomplete hint
    if (passwordInput) passwordInput.setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
  };

  const showConnectedView = (email) => {
    if (loginFormView) loginFormView.classList.add('hidden');
    if (loginConnectedView) loginConnectedView.classList.remove('hidden');
    if (loginConnectedMessage) {
      const safeEmail = String(email || '').trim();
      loginConnectedMessage.textContent = safeEmail
        ? `Você (${safeEmail}) está conectado!`
        : 'Você está conectado!';
    }
    // Focus something sensible
    if (loginConnectedOk) loginConnectedOk.focus();
    else if (loginPopupClose) loginPopupClose.focus();
  };

  const showLoginFormView = () => {
    if (loginConnectedView) loginConnectedView.classList.add('hidden');
    if (loginFormView) loginFormView.classList.remove('hidden');
  };

  // Focus trap for modal dialog
  const handleTrapFocus = (e) => {
    if (!isPopupOpen) return;
    if (e.key !== 'Tab') return;
    const focusables = getFocusableElements(loginPopup);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !loginPopup.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Open popup
  const openPopup = () => {
    isPopupOpen = true;
    lastFocusedElement = document.activeElement;
    loginPopup.classList.remove('hidden');
    setAriaHidden(loginPopup, false);
    loginButton.setAttribute('aria-expanded', 'true');
    playSound('open');

    // If already authenticated, show connected message instead of the form
    if (isAuthenticated()) {
      const storedEmail = getStoredUserEmail();
      showConnectedView(storedEmail);
      return;
    }

    showLoginFormView();
    setAuthMode('login');
    // Focus on email input for accessibility
    const emailInput = document.getElementById('loginEmail');
    const stored = getStoredUserEmail();
    if (emailInput && stored && !emailInput.value) emailInput.value = stored;
    if (emailInput) emailInput.focus();
  };

  // Close popup
  const closePopup = () => {
    isPopupOpen = false;
    loginPopup.classList.add('hidden');
    setAriaHidden(loginPopup, true);
    loginButton.setAttribute('aria-expanded', 'false');
    playSound('close');
    // Reset password visibility (privacy + predictable UX)
    if (passwordInput) passwordInput.type = 'password';
    if (togglePasswordBtn) {
      togglePasswordBtn.setAttribute('aria-pressed', 'false');
      togglePasswordBtn.setAttribute('aria-label', 'Mostrar password');
      togglePasswordBtn.textContent = 'Mostrar';
    }
    // Prefer returning focus to where the user was, otherwise fallback to login button
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    } else {
      loginButton.focus();
    }
  };

  // Toggle popup
  loginButton.addEventListener('click', (e) => {
    e.stopPropagation();
    // Feedback sound on press (distinct from open/close)
    playSound('click');
    if (isPopupOpen) {
      closePopup();
    } else {
      openPopup();
    }
  });

  // Close on X button
  if (loginPopupClose) {
    loginPopupClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });
  }

  // Handle form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      const password = document.getElementById('loginPassword')?.value;
      const confirmPassword = document.getElementById('loginPasswordConfirm')?.value;
      const remember = Boolean(document.getElementById('rememberMe')?.checked);

      if (submitBtn) submitBtn.disabled = true;

      try {
        const isSignup = authMode === 'signup';
        if (isSignup) {
          if (!confirmPassword || String(confirmPassword) !== String(password || '')) {
            throw new Error('As passwords não coincidem');
          }
        }

        const data = isSignup
          ? await registerUser({ email, password })
          : await loginUser({ email, password, rememberMe: remember });
        playSound('login');

        const userEmail = data?.user?.email || String(email || '').trim();
        if (userEmail) {
          loginButton.textContent = formatUserLabel(userEmail);
          loginButton.setAttribute('aria-label', `Conta: ${userEmail}`);
        }

        showNotification('Sessão iniciada.', 'success', 2000);

        // Best-effort: envia settings atuais (tema/som) para a DB
        const theme = (() => {
          try { return localStorage.getItem('theme'); } catch { return null; }
        })();
        const soundMuted = (() => {
          try { return localStorage.getItem('soundMuted') === 'true'; } catch { return undefined; }
        })();
        const payload = {};
        if (theme === 'dark' || theme === 'light') payload.theme = theme;
        if (typeof soundMuted !== 'undefined') payload.soundMuted = soundMuted;
        if (Object.keys(payload).length) {
          try { await updateUserSettings(payload); } catch (_) { /* ignore */ }
        }

        // Replace the login form with a connected message
        showConnectedView(userEmail);
      } catch (err) {
        console.error('Login failed:', err);
        showNotification(err?.message || 'Falha ao iniciar sessão', 'error', 4000);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Password visibility toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = passwordInput.type === 'text';
      const nextVisible = !isVisible;

      passwordInput.type = nextVisible ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-pressed', nextVisible ? 'true' : 'false');
      togglePasswordBtn.setAttribute('aria-label', nextVisible ? 'Ocultar password' : 'Mostrar password');
      togglePasswordBtn.textContent = nextVisible ? 'Ocultar' : 'Mostrar';
      try { passwordInput.focus(); } catch (_) {}
    });
  }

  if (togglePasswordConfirmBtn && passwordConfirmInput) {
    togglePasswordConfirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = passwordConfirmInput.type === 'text';
      const nextVisible = !isVisible;
      passwordConfirmInput.type = nextVisible ? 'text' : 'password';
      togglePasswordConfirmBtn.setAttribute('aria-pressed', nextVisible ? 'true' : 'false');
      togglePasswordConfirmBtn.setAttribute('aria-label', nextVisible ? 'Ocultar confirmação de password' : 'Mostrar confirmação de password');
      togglePasswordConfirmBtn.textContent = nextVisible ? 'Ocultar' : 'Mostrar';
      try { passwordConfirmInput.focus(); } catch (_) {}
    });
  }

  // Tabs
  if (tabLogin) {
    tabLogin.addEventListener('click', (e) => {
      e.stopPropagation();
      setAuthMode('login');
      document.getElementById('loginEmail')?.focus();
    });
  }
  if (tabSignup) {
    tabSignup.addEventListener('click', (e) => {
      e.stopPropagation();
      setAuthMode('signup');
      document.getElementById('loginEmail')?.focus();
    });
  }

  // Connected screen "Ok" closes the popup
  if (loginConnectedOk) {
    loginConnectedOk.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });
  }

  // Sign out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAuth();
      loginButton.textContent = 'Login';
      loginButton.setAttribute('aria-label', 'Login');
      showNotification('Sessão terminada.', 'info', 2000);
      showLoginFormView();
      setAuthMode('login');
      closePopup();
    });
  }

  // Close on clicking outside popup
  document.addEventListener('click', (e) => {
    if (isPopupOpen && !loginPopup.contains(e.target) && !loginButton.contains(e.target)) {
      closePopup();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPopupOpen) {
      closePopup();
    }
  });

  // Trap focus inside popup when open (modal)
  document.addEventListener('keydown', handleTrapFocus);
}

// ==================== SHARED NOTIFICATION SYSTEM ====================
let notificationContainer = null;

/**
 * Create a shared notification element
 */
function getNotificationContainer() {
  if (notificationContainer) return notificationContainer;
  
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  notificationContainer.setAttribute('role', 'alert');
  notificationContainer.setAttribute('aria-live', 'polite');
  notificationContainer.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(notificationContainer);
  return notificationContainer;
}

// Constants
const INITIALIZATION_DELAY = 2000; // 2 seconds
const RESIZE_DEBOUNCE_DELAY = 150; // 150ms

// Track if app is still initializing (to prevent notification sounds during startup)
let isInitializing = true;
setTimeout(() => { isInitializing = false; }, INITIALIZATION_DELAY);

// Notification colors cache
const NOTIFICATION_COLORS = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
  info: 'var(--primary)'
};

/**
 * Show a notification toast
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'warning', 'error', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 * @param {boolean} playSoundOnNotification - Whether to play notification sound (default: true, false during initialization)
 */
export function showNotification(message, type = 'success', duration = 3000, playSoundOnNotification = true) {
  // Play notification sound only if not during initialization (to avoid conflict with intro sound)
  if (playSoundOnNotification && !isInitializing) {
    playSound('notification');
  }

  const container = getNotificationContainer();
  const notification = document.createElement('div');
  
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  notification.style.cssText = `
    background-color: ${NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.success};
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: auto;
  `;

  container.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  });

  // Remove after duration
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Show notification without playing notification sound (for timer end, etc.)
 * Shared utility to avoid code duplication
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'warning', 'error', 'info'
 * @param {number} duration - Duration in ms (default: 5000)
 */
export function showCustomNotification(message, type = 'success', duration = 5000) {
  showNotification(message, type, duration, false);
}

// ==================== KEYBOARD SHORTCUTS ====================
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields (but allow Escape to close UI)
    const isFormField =
      e.target &&
      (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
    if (isFormField && e.key !== 'Escape') return;

    // Ctrl/Cmd + Shift + P: Toggle Pomodoro
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      toggleCard('pomodoroButton', 'pomodoroCard');
    }

    // Ctrl/Cmd + Shift + T: Toggle Timer
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggleCard('timerButton', 'timerCard');
    }

    // Ctrl/Cmd + Shift + L: Toggle TaskList
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      toggleCard('tasklistButton', 'tasklistCard');
    }

    // Ctrl/Cmd + Shift + C: Toggle Countdown
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      toggleCard('countdownButton', 'countdownCard');
    }

    // Ctrl/Cmd + Shift + W: Toggle World Clock
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') {
      e.preventDefault();
      toggleCard('worldClockButton', 'worldClockCard');
    }

    // Ctrl/Cmd + Shift + D: Toggle Dark/Light theme
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const themeToggle = document.querySelector('theme-toggle');
      if (themeToggle && typeof themeToggle.toggleTheme === 'function') {
        themeToggle.toggleTheme();
      }
    }

    // Escape: Close all cards
    if (e.key === 'Escape') {
      closeAllCards();
    }
  });
}

/**
 * Toggle a card's visibility
 */
function toggleCard(buttonId, cardId) {
  const button = document.getElementById(buttonId);
  const card = document.getElementById(cardId);
  if (!button || !card) return;

  // Simulate button click to toggle
  button.click();
}

/**
 * Close all open cards
 */
function closeAllCards() {
  const cards = document.querySelectorAll('.card:not(.hidden)');
  const buttons = document.querySelectorAll('#buttonContainer button.pressed');

  cards.forEach(card => {
    card.classList.add('hidden');
    setAriaHidden(card, true);
  });

  buttons.forEach(button => {
    button.classList.remove('pressed');
    button.setAttribute('aria-pressed', 'false');
  });
}

// ==================== NAVBAR DROPDOWNS ====================
export function setupNavbarDropdowns() {
  const dropdownButtons = document.querySelectorAll('.navbar-dropdown-btn');
  const dropdowns = document.querySelectorAll('.navbar-dropdown');
  let lastActiveButton = null;

  // Initialize aria-hidden based on current state
  dropdowns.forEach(dropdown => {
    setAriaHidden(dropdown, dropdown.classList.contains('hidden'));
  });

  // Close all dropdowns
  const closeAllDropdowns = ({ returnFocus = false } = {}) => {
    dropdowns.forEach(dropdown => {
      dropdown.classList.add('hidden');
      setAriaHidden(dropdown, true);
    });
    dropdownButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });

    if (returnFocus && lastActiveButton) {
      lastActiveButton.focus();
      lastActiveButton = null;
    }
  };

  // Toggle specific dropdown
  const toggleDropdown = (button) => {
    const dropdownId = button.getAttribute('data-dropdown');
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    if (!dropdown) return;

    const isOpen = !dropdown.classList.contains('hidden');

    // Close all dropdowns first
    closeAllDropdowns({ returnFocus: false });

    if (!isOpen) {
      dropdown.classList.remove('hidden');
      button.classList.add('active');
      button.setAttribute('aria-expanded', 'true');
      setAriaHidden(dropdown, false);
      lastActiveButton = button;

      // Move focus into dropdown for keyboard users
      const focusables = getFocusableElements(dropdown);
      if (focusables[0]) focusables[0].focus();
    }
  };

  // Add click handlers to dropdown buttons
  dropdownButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(button);
      playSound('open');
    });
  });

  // Add click handlers to close buttons
  const closeButtons = document.querySelectorAll('.dropdown-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('close');
      const dropdown = btn.closest('.navbar-dropdown');
      const button = dropdown
        ? document.querySelector(`.navbar-dropdown-btn[data-dropdown="${dropdown.id.replace('dropdown-', '')}"]`)
        : null;
      if (dropdown) {
        dropdown.classList.add('hidden');
        setAriaHidden(dropdown, true);
      }
      if (button) {
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-dropdown') && !e.target.closest('.navbar-dropdown-btn')) {
      closeAllDropdowns({ returnFocus: false });
    }
  });

  // Close dropdowns on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns({ returnFocus: true });
    }
  });
}
