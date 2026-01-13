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
import { TaskList } from './tasklist.js';
import { CountdownTimer } from './countdown.js';
import { WorldClock } from './worldclock.js';
import { initDragFunctionality, initNavbarToggle, setupToggle } from './utils.js';

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
    console.info('UI utilities initialized');
  } catch (error) {
    console.error('Failed to initialize UI utilities:', error);
    showErrorNotification('Failed to initialize drag and navbar functionality');
  }

  try {
    // Initialize card positions
    Object.entries(cardPositions).forEach(([cardId, xOffset]) => {
      const card = document.getElementById(cardId);
      if (card && xOffset !== null && xOffset !== undefined) {
        // Calculate left position: 50% + xOffset pixels
        card.style.left = `calc(50% + ${xOffset}px)`;
      }
    });
    console.info('Card positions configured');
  } catch (error) {
    console.error('Failed to configure card positions:', error);
  }

  try {
    // Initialize all timer and utility classes
    const pomodoroTimer = new PomodoroTimer();
    const simpleTimer = new SimpleTimer();
    const taskListInstance = window.taskListInstance = new TaskList();
    const countdownTimer = new CountdownTimer();
    const worldClockInstance = window.worldClockInstance = new WorldClock();
    console.info('All timer features initialized');
  } catch (error) {
    console.error('Failed to initialize timer features:', error);
    showErrorNotification('Failed to load timer functionality');
  }

  try {
    // Setup toggle buttons for cards
    setupToggle('pomodoroButton', 'pomodoroCard');
    setupToggle('timerButton', 'timerCard');
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
