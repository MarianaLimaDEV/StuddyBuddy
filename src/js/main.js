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
import { PomodoroTimer } from './pomodoro.js';
import { SimpleTimer } from './timer.js';
import { Stopwatch } from './stopwatch.js';
import { TaskList } from './tasklist.js';
import { CountdownTimer } from './countdown.js';
import { WorldClock } from './worldclock.js';
import { initDragFunctionality, initNavbarToggle, setupToggle, setupLoginPopup, setupNavbarDropdowns, initKeyboardShortcuts, showNotification, initGlobalClickSound } from './utils.js';
import { initSoundManager, toggleSound, isSoundMuted, playSound } from './sound.js';

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

  try {
    // Initialize utilities
    initDragFunctionality();
    initNavbarToggle();
    setupLoginPopup();
    setupNavbarDropdowns();
    initKeyboardShortcuts();
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
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(positionCards, 150);
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

    // Play intro sound when app starts
    playSound('intro');
    console.info('🔊 Opening sound played');

    // Initialize global click sounds AFTER opening sound
    // This prevents overlap between opening sound and click sounds
    initGlobalClickSound();
    console.info('🔊 Global click sound initialized');
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

      muteToggleBtn.addEventListener('click', () => {
        const muted = toggleSound();
        updateMuteButtonUI(muted);
        playSound('mute_toggle');
        showNotification(muted ? 'Som desativado' : 'Som ativado', 'info', 2000);
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
  } catch (error) {
    console.error('Failed to configure toggle buttons:', error);
  }
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
    muteToggleBtn.setAttribute('aria-pressed', 'false');
  } else {
    if (muteIcon) muteIcon.style.display = 'inline';
    if (unmuteIcon) unmuteIcon.style.display = 'none';
    muteToggleBtn.setAttribute('aria-pressed', 'true');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// ==================== LOGO CLICK SOUND ====================
// Play opening sound when clicking the logo to refresh
const logoLink = document.querySelector('.navbar-logo');
if (logoLink) {
  logoLink.addEventListener('click', (e) => {
    // Only play if it's actually refreshing (not just navigation)
    // The href is "index.html" so it will refresh the page
    playSound('intro');
  });
}
