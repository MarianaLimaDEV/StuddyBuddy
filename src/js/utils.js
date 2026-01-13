/**
 * Utility Functions Module
 * Shared utilities for drag functionality and UI interactions
 */

// ==================== DRAG FUNCTIONALITY ====================
let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;

export function initDragFunctionality() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      activeCard = card;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = card.offsetLeft;
      initialTop = card.offsetTop;
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
    activeCard.style.left = (initialLeft + dx) + 'px';
    activeCard.style.top = (initialTop + dy) + 'px';
}

function pointerUp(e){
    if (!activeCard) return;
    if (e.pointerId && activeCard.releasePointerCapture) {
      try { activeCard.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    activeCard = null;
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

  // Close card when clicking outside (but not on internal buttons)
  document.addEventListener('click', (e) => {
    if (isPressed && !card.contains(e.target) && !button.contains(e.target)) {
      // Check if clicked element is not inside the card
      const clickedInCard = card.querySelector('*:hover');
      if (!clickedInCard) {
        isPressed = false;
        button.classList.remove('pressed');
        card.classList.add('hidden');
      }
    }
  });
}
