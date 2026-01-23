/**
 * Utility Functions Module
 * Shared utilities for drag functionality and UI interactions
 */
import { playSound } from './sound.js';

// ==================== GLOBAL CLICK SOUND ====================
// Add click2 sound to ALL mouse clicks (except on specific elements)
let globalClickHandler = null;

export function initGlobalClickSound() {
  // Remove existing handler if any
  if (globalClickHandler) {
    document.removeEventListener('click', globalClickHandler);
  }

  // Create new handler
  globalClickHandler = (e) => {
    // Don't play sound on these elements (they have their own sounds)
    if (
      e.target.closest('.card-close') ||
      e.target.closest('#muteToggle') ||
      e.target.closest('button') ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('select') ||
      e.target.closest('.navbar-dropdown') ||
      e.target.closest('.login-popup') ||
      e.target.closest('.contact-btn') ||
      e.target.closest('.social-btn') ||
      e.target.closest('a')
    ) {
      // These elements play their own specific sounds
      return;
    }

    // Play interact sound on any mouse click
    playSound('interact');
  };

  // Add to document
  document.addEventListener('click', globalClickHandler, { passive: true });
  console.info('🔊 Global click sound initialized (any_click on all clicks)');
}

// Note: initGlobalClickSound() is called from main.js AFTER the opening sound plays
// This prevents overlap between the opening sound and click sounds

// ==================== DRAG FUNCTIONALITY ====================
let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;
let isDragging = false;
const DRAG_THRESHOLD = 5; // pixels - minimum movement to start dragging

export function initDragFunctionality() {
  document.querySelectorAll('.card').forEach(card => {
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

  toggle.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');

  const openMenu = () => {
    menu.classList.add('open');
    toggle.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    const firstLink = menu.querySelector('a'); if (firstLink) firstLink.focus();
  };

  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
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

  let isPressed = false;
  button.addEventListener('click', () => {
    isPressed = !isPressed;
    if (isPressed) {
      button.classList.add('pressed');
      card.classList.remove('hidden');
      playSound('open');
    } else {
      button.classList.remove('pressed');
      card.classList.add('hidden');
    }
  });

  // Close card when clicking the close button
  const closeBtn = card.querySelector('.card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('close');
      isPressed = false;
      button.classList.remove('pressed');
      card.classList.add('hidden');
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

  if (!loginButton || !loginPopup) return;

  let isPopupOpen = false;

  // Open popup
  const openPopup = () => {
    isPopupOpen = true;
    loginPopup.classList.remove('hidden');
    loginButton.setAttribute('aria-expanded', 'true');
    playSound('open');
    // Focus on email input for accessibility
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) emailInput.focus();
  };

  // Close popup
  const closePopup = () => {
    isPopupOpen = false;
    loginPopup.classList.add('hidden');
    loginButton.setAttribute('aria-expanded', 'false');
    loginButton.focus();
  };

  // Toggle popup
  loginButton.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('open');
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
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Here you would typically handle the login logic
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const rememberMe = document.getElementById('rememberMe').checked;

      console.log('Login attempt:', { email, rememberMe });
      playSound('login');
      // Simulate successful login
      alert('Login functionality would be implemented here!');
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

/**
 * Show a notification toast
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'warning', 'error'
 * @param {number} duration - Duration in ms (default: 3000)
 */
export function showNotification(message, type = 'success', duration = 3000) {
  // Play notification sound
  playSound('notification');

  const container = getNotificationContainer();
  const notification = document.createElement('div');
  
  const colors = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--danger)',
    info: 'var(--primary)'
  };

  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  notification.style.cssText = `
    background-color: ${colors[type] || colors.success};
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

// ==================== KEYBOARD SHORTCUTS ====================
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

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
  });

  buttons.forEach(button => {
    button.classList.remove('pressed');
  });
}

// ==================== NAVBAR DROPDOWNS ====================
export function setupNavbarDropdowns() {
  const dropdownButtons = document.querySelectorAll('.navbar-dropdown-btn');
  const dropdowns = document.querySelectorAll('.navbar-dropdown');

  // Close all dropdowns
  const closeAllDropdowns = () => {
    dropdowns.forEach(dropdown => {
      dropdown.classList.add('hidden');
    });
    dropdownButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  };

  // Toggle specific dropdown
  const toggleDropdown = (button) => {
    const dropdownId = button.getAttribute('data-dropdown');
    const dropdown = document.getElementById(`dropdown-${dropdownId}`);
    if (!dropdown) return;

    const isOpen = !dropdown.classList.contains('hidden');

    // Close all dropdowns first
    closeAllDropdowns();

    if (!isOpen) {
      dropdown.classList.remove('hidden');
      button.classList.add('active');
      button.setAttribute('aria-expanded', 'true');
      playSound('open');
    }
  };

  // Add click handlers to dropdown buttons
  dropdownButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('open');
      toggleDropdown(button);
    });
  });

  // Add click handlers to close buttons
  const closeButtons = document.querySelectorAll('.dropdown-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('close');
      const dropdown = btn.closest('.navbar-dropdown');
      const button = document.querySelector(`.navbar-dropdown-btn[data-dropdown="${dropdown.id.replace('dropdown-', '')}"]`);
      if (dropdown) dropdown.classList.add('hidden');
      if (button) {
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-dropdown') && !e.target.closest('.navbar-dropdown-btn')) {
      closeAllDropdowns();
    }
  });

  // Close dropdowns on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }
  });
}
