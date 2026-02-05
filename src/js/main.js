// ==================== CARD POSITIONS CONFIG ====================
// Configure x positions for all popup cards (in pixels from center)
// Set to null or undefined to use default centered position
const cardPositions = {
  pomodoroCard: null,    // Centered (default)
  timerCard: 300,        // 300px to the right of center
  tasklistCard: -300,    // 300px to the left of center
  countdownCard: null,   // Centered (default)
  worldClockCard: 600,   // 600px to the right of center
};

// Import all modules
import '../scss/main.scss';
import { PomodoroTimer } from './pomodoro.js';
import { SimpleTimer } from './timer.js';
import { Stopwatch } from './stopwatch.js';
import { CountdownTimer } from './countdown.js';
import { TaskList } from './tasklist.js';
import { WorldClock } from './worldclock.js';
import { initSoundManager, playSound, toggleSound, isSoundMuted, setSoundMuted } from './sound.js';
import {
  initDragFunctionality,
  initNavbarToggle,
  setupLoginPopup,
  setupNavbarDropdowns,
  initKeyboardShortcuts,
  initFocusMode,
  initShortcutsModal,
  initGlobalClickSound,
  initGlobalInputFocusSound,
  setupToggle,
  showNotification,
  initCookieBanner,
  fetchUserSettings,
  updateUserSettings,
  isAuthenticated,
  getStoredUserEmail,
  formatUserLabel
} from './utils.js';
import { renderStatsIn } from './study-stats.js';
/**
 * Initialize all features on DOM ready
 */
async function initializeApp() {
  try {
    // Import and initialize theme toggle
    await import('./theme-toggle.js');
    console.info('Theme toggle initialized');
  } catch (error) {
    console.error('Failed to initialize theme toggle:', error);
    showErrorNotification('Failed to load theme toggle functionality');
  }

  // If already logged in, hydrate settings from DB
  try {
    const storedEmail = getStoredUserEmail();
    const loginButton = document.getElementById('loginButton');
    if (storedEmail && loginButton) {
      loginButton.textContent = formatUserLabel(storedEmail);
      loginButton.setAttribute('aria-label', `Conta: ${storedEmail}`);
    }

    if (isAuthenticated()) {
      const settings = await fetchUserSettings();

      if (settings?.theme === 'dark' || settings?.theme === 'light') {
        const themeToggle = document.querySelector('theme-toggle');
        if (themeToggle && typeof themeToggle.setTheme === 'function') {
          themeToggle.setTheme(settings.theme);
        } else {
          document.body.setAttribute('data-theme', settings.theme);
          try { localStorage.setItem('theme', settings.theme); } catch (_) {}
        }
      }

      if (typeof settings?.soundMuted !== 'undefined') {
        setSoundMuted(Boolean(settings.soundMuted));
        updateMuteButtonUI(Boolean(settings.soundMuted));
      }
    }
  } catch (error) {
    console.warn('Could not load user settings from API:', error);
  }

  try {
    // Initialize utilities
    initDragFunctionality();
    initNavbarToggle();
    setupLoginPopup();
    setupNavbarDropdowns();
    initKeyboardShortcuts();
    initFocusMode();
    initShortcutsModal();
    initCookieBanner();
    renderSidebarStats();
    window.addEventListener('studystats-updated', renderSidebarStats);
    initSidebarTab();
    console.info('UI utilities initialized');
  } catch (error) {
    console.error('Failed to initialize UI utilities:', error);
    showErrorNotification('Failed to initialize drag and navbar functionality');
  }

  try {
    // Function to position cards within viewport boundaries
    const positionCards = () => {
      Object.entries(cardPositions).forEach(([cardId, xOffset]) => {
        const card = document.getElementById(cardId);
        if (card && xOffset !== null && xOffset !== undefined) {
          // Get card dimensions
          const cardWidth = card.offsetWidth || 400; // fallback to default
          const viewportWidth = window.innerWidth;
          
          // Calculate desired left position
          let leftPos = (viewportWidth / 2) + xOffset;
          
          // Ensure card stays within viewport
          const minLeft = 10; // 10px margin from left
          const maxLeft = viewportWidth - cardWidth - 10; // 10px margin from right
          
          leftPos = Math.max(minLeft, Math.min(leftPos, maxLeft));
          
          card.style.left = `${leftPos}px`;
          card.style.transform = 'none'; // Remove centering transform
        }
      });
    };

    // Initial positioning
    positionCards();

    // Reposition on window resize with debounce
    let resizeTimeout;
    const RESIZE_DEBOUNCE_DELAY = 150;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(positionCards, RESIZE_DEBOUNCE_DELAY);
    });

    console.info('Card positions configured with viewport boundaries');
  } catch (error) {
    console.error('Failed to configure card positions:', error);
  }

  try {
    // Initialize all timer and utility classes
    const pomodoroTimer = new PomodoroTimer();
    const simpleTimer = new SimpleTimer();
    const stopwatchInstance = window.stopwatchInstance = new Stopwatch();
    const taskListInstance = window.taskListInstance = new TaskList();
    const countdownTimer = new CountdownTimer();
    const worldClockInstance = window.worldClockInstance = new WorldClock();
    console.info('All timer features initialized');
  } catch (error) {
    console.error('Failed to initialize timer features:', error);
    showErrorNotification('Failed to load timer functionality');
  }

try {
    // Initialize sound manager
    initSoundManager();
    console.info('🔊 Sound manager initialized');

    // Initialize global click sounds
    initGlobalClickSound();
    console.info('🔊 Global click sound initialized');
    
    // Play interact sound when focusing inputs/selects/textareas
    initGlobalInputFocusSound();
 
    // Intro should play ONLY on page load/refresh.
    // Browsers may block autoplay until the user interacts at least once.
    // Strategy:
    // - Try to play on load/refresh.
    // - If blocked, play once on first user interaction (still "this refresh"),
    //   and remember that autoplay is allowed for future refreshes.
    const INTRO_AUTOPLAY_KEY = 'introAutoplayAllowed';
    let introPlayedThisLoad = false;

    const tryPlayIntro = () => {
      if (introPlayedThisLoad) return;
      if (isSoundMuted()) return;

      // Use a direct Audio() here so we can detect autoplay blocking via the promise.
      const a = new Audio('/sfx/INTRO.mp3');
      a.volume = 0.7;

      a.play()
        .then(() => {
          introPlayedThisLoad = true;
          try { localStorage.setItem(INTRO_AUTOPLAY_KEY, 'true'); } catch (_) {}
        })
        .catch(() => {
          // Autoplay blocked (or other issue). We'll try once on first interaction.
        });
    };

    // Attempt immediately on load/refresh
    tryPlayIntro();

    // If autoplay isn't allowed yet, unlock on first interaction and play intro once.
    const autoplayAllowed = (() => {
      try { return localStorage.getItem(INTRO_AUTOPLAY_KEY) === 'true'; } catch (_) { return false; }
    })();

    if (!autoplayAllowed) {
      const unlockAndPlayIntro = () => {
        // Only attempt if it hasn't played yet for this load
        if (!introPlayedThisLoad) tryPlayIntro();
      };
      document.addEventListener('click', unlockAndPlayIntro, { once: true });
      document.addEventListener('keydown', unlockAndPlayIntro, { once: true });
      document.addEventListener('touchstart', unlockAndPlayIntro, { once: true });
    }
  } catch (error) {
    console.error('Failed to initialize sound manager:', error);
  }

  try {
    // Setup mute toggle button
    const muteToggleBtn = document.getElementById('muteToggle');
    if (muteToggleBtn) {
      // Set initial state based on saved preference
      if (isSoundMuted()) {
        updateMuteButtonUI(true);
      }

      muteToggleBtn.addEventListener('click', async () => {
        const muted = toggleSound();
        updateMuteButtonUI(muted);
        playSound('mute_toggle');
        showNotification(muted ? 'Som desativado' : 'Som ativado', 'info', 2000);

        // Sync to DB (best-effort)
        if (isAuthenticated()) {
          try { await updateUserSettings({ soundMuted: muted }); } catch (_) { /* ignore */ }
        }
      });
    }
    console.info('Mute toggle configured');
  } catch (error) {
    console.error('Failed to configure mute toggle:', error);
  }

  try {
    // Setup toggle buttons for cards
    setupToggle('pomodoroButton', 'pomodoroCard');
    setupToggle('timerButton', 'timerCard');
    setupToggle('stopwatchButton', 'stopwatchCard');
    setupToggle('tasklistButton', 'tasklistCard');
    setupToggle('countdownButton', 'countdownCard');
    setupToggle('worldClockButton', 'worldClockCard');
    console.info('Toggle buttons configured');

    // PWA shortcuts: open tool from ?tool= param
    const params = new URLSearchParams(window.location.search);
    const tool = params.get('tool');
    const toolMap = {
      pomodoro: 'pomodoroButton',
      timer: 'timerButton',
      stopwatch: 'stopwatchButton',
      tasklist: 'tasklistButton',
      countdown: 'countdownButton',
      worldclock: 'worldClockButton'
    };
    const btnId = tool && toolMap[tool.toLowerCase()];
    if (btnId) {
      const btn = document.getElementById(btnId);
      if (btn) setTimeout(() => btn.click(), 100);
    }
  } catch (error) {
    console.error('Failed to configure toggle buttons:', error);
  }

  // Sync theme changes to DB (best-effort, debounced)
  try {
    let themeSyncTimeout = null;
    const observer = new MutationObserver(() => {
      if (!isAuthenticated()) return;
      const theme = document.body.getAttribute('data-theme');
      if (theme !== 'dark' && theme !== 'light') return;

      clearTimeout(themeSyncTimeout);
      themeSyncTimeout = setTimeout(async () => {
        try { await updateUserSettings({ theme }); } catch (_) { /* ignore */ }
      }, 300);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) {
    // ignore
  }
}

function renderSidebarStats() {
  renderStatsIn('sidebarStats');
}

function initSidebarTab() {
  const tab = document.getElementById('sidebarTab');
  const sidebar = document.getElementById('leftSidebar');
  const indicator = document.getElementById('sidebarIndicator');
  if (!sidebar) return;

  const toggleSidebar = () => {
    const open = document.body.classList.toggle('sidebar-open');
    tab?.setAttribute('aria-expanded', open);
    if (tab) tab.textContent = open ? '\u00d7' : '\u203a';
  };

  tab?.addEventListener('click', toggleSidebar);
  // Em touch: clicar na barrinha abre/fecha
  indicator?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
}

/**
 * Show user-friendly error notification
 * @param {string} message - Error message to display
 */
function showErrorNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('error-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--danger);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
  }, 5000);
}

/**
 * Update mute button UI based on mute state
 * @param {boolean} muted - Whether sound is muted
 */
function updateMuteButtonUI(muted) {
  const muteToggleBtn = document.getElementById('muteToggle');
  if (!muteToggleBtn) return;

  const muteIcon = muteToggleBtn.querySelector('.mute-icon');
  const unmuteIcon = muteToggleBtn.querySelector('.unmute-icon');

  if (muted) {
    if (muteIcon) muteIcon.style.display = 'none';
    if (unmuteIcon) unmuteIcon.style.display = 'inline';
    // pressed = muted
    muteToggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    if (muteIcon) muteIcon.style.display = 'inline';
    if (unmuteIcon) unmuteIcon.style.display = 'none';
    muteToggleBtn.setAttribute('aria-pressed', 'false');
  }
}

// PWA: register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
