let newX = 0, newY = 0, startX = 0, startY = 0;

const card = document.getElementById('card');

if (card) {
  card.addEventListener('mousedown', mouseDown);
}

function mouseDown(e){
    e.preventDefault(); // prevent text selection start
    startX = e.clientX;
    startY = e.clientY;

    // disable text selection globally while dragging
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
}

function mouseMove(e){
    newX = startX - e.clientX;
    newY = startY - e.clientY;
  
    startX = e.clientX;
    startY = e.clientY;

    card.style.top = (card.offsetTop - newY) + 'px';
    card.style.left = (card.offsetLeft - newX) + 'px';
}

function mouseUp(e){
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);

    // restore text selection
    document.body.style.userSelect = '';
}

/* Navbar toggle (mobile) — minimal, accessible */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.navbar-toggle');
  const menu = document.getElementById('navbar-menu') || document.querySelector('.navbar-menu');
  if (!toggle || !menu) return;

  // initialize ARIA
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

  // click outside closes
  document.addEventListener('click', (ev) => {
    if (!menu.contains(ev.target) && !toggle.contains(ev.target) && menu.classList.contains('open')) closeMenu();
  });

  // ESC to close
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  // close on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && menu.classList.contains('open')) closeMenu();
  });
});

