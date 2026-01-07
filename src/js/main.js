let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;

// Adiciona drag a todos os cards arrastáveis
document.querySelectorAll('#card, #card1').forEach(card => {
  card.addEventListener('mousedown', (e) => {
    activeCard = card;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = card.offsetLeft;
    initialTop = card.offsetTop;
    
    e.preventDefault();
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  });
});

function mouseMove(e){
    if (!activeCard) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    activeCard.style.left = (initialLeft + dx) + 'px';
    activeCard.style.top = (initialTop + dy) + 'px';
}

function mouseUp(e){
    activeCard = null;
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);
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



// Seleciona os elementos
const toggleButton = document.getElementById('toggleButton');
const toggleCard = document.getElementById('card');

// Estado inicial: botão em "Não" (não pressionado), card escondido
let isPressed = false;

// Função para alternar
toggleButton.addEventListener('click', () => {
    isPressed = !isPressed;
    
    if (isPressed) {
        // Estado "Sim": botão pressionado, card visível
        toggleButton.textContent = 'Sim';
        toggleButton.classList.add('pressed');
        toggleCard.classList.remove('hidden');
    } else {
        // Estado "Não": botão não pressionado, card escondido
        toggleButton.textContent = 'Não';
        toggleButton.classList.remove('pressed');
        toggleCard.classList.add('hidden');
    }
});
