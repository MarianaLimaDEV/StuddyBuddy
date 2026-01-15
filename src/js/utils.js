/**
 * Utility Functions Module
 * Shared utilities for drag functionality and UI interactions
 */

// ==================== DRAG FUNCTIONALITY ====================
let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;
let isDragging = false;
const DRAG_THRESHOLD = 5; // pixels - minimum movement to start dragging

export function initDragFunctionality() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      // Don't start drag if clicking on close buttons or internal buttons
      if (e.target.closest('.card-close') || e.target.closest('button')) return;
      
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
    }
  };

  // Add click handlers to dropdown buttons
  dropdownButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(button);
    });
  });

  // Add click handlers to close buttons
  const closeButtons = document.querySelectorAll('.dropdown-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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
