/**
 * Simple i18n: PT / EN toggle
 * Store preference in localStorage as 'lang' ('pt' | 'en')
 */
import { isAuthenticated, getStoredUserEmail, formatUserLabel } from './utils.js';

const STORAGE_KEY = 'lang';
let currentLang = null; // fallback when localStorage is unavailable

const t = {
  skipLink: { pt: 'Saltar para o conteúdo principal', en: 'Skip to main content' },
  sidebarAria: { pt: 'Estatísticas e modo foco', en: 'Stats and focus mode' },
  sidebarTabAria: { pt: 'Abrir painel lateral', en: 'Open side panel' },
  focusMode: { pt: 'Modo foco', en: 'Focus mode' },
  focusModeAria: { pt: 'Ativar modo foco', en: 'Activate focus mode' },
  focusModeExit: { pt: 'Sair modo foco', en: 'Exit focus mode' },
  focusModeExitAria: { pt: 'Sair do modo foco', en: 'Exit focus mode' },
  navAria: { pt: 'Menu principal', en: 'Main menu' },
  logoAria: { pt: 'StuddyBuddy - Página inicial', en: 'StuddyBuddy - Home' },
  sobre: { pt: 'Sobre', en: 'About' },
  sobreText: { pt: 'O StuddyBuddy é uma plataforma de estudo com ferramentas práticas: Pomodoro para sessões de foco, Timer, Cronómetro, lista de tarefas, contagem regressiva e relógio mundial. Faz login para sincronizar o teu tema e preferências na nuvem.', en: 'StuddyBuddy is a study platform with practical tools: Pomodoro for focus sessions, Timer, Stopwatch, task list, countdown and world clock. Log in to sync your theme and preferences in the cloud.' },
  configuracoes: { pt: 'Configurações', en: 'Settings' },
  appLabel: { pt: 'App', en: 'App' },
  appInstall: { pt: 'Instalar', en: 'Install' },
  appInstallAria: { pt: 'Instalar a app', en: 'Install the app' },
  appDownload: { pt: 'Download', en: 'Download' },
  appDownloadAria: { pt: 'Baixar / instalar a app', en: 'Download / install the app' },
  appInstallHint: { pt: 'Clica em “Download” para ver as opções de instalação. No iOS: “Partilhar” → “Adicionar ao ecrã principal”.', en: 'Click “Download” to see install options. On iOS: “Share” → “Add to Home Screen”.' },
  appInstallReady: { pt: 'Instalação disponível neste browser.', en: 'Install is available in this browser.' },
  appAlreadyInstalled: { pt: 'A app já está instalada.', en: 'The app is already installed.' },
  appInstalledBtn: { pt: 'Instalada', en: 'Installed' },
  appInstalled: { pt: 'App instalada com sucesso.', en: 'App installed successfully.' },
  appInstallDismissed: { pt: 'Instalação cancelada.', en: 'Install dismissed.' },
  appInstallIosHint: { pt: 'No iPhone/iPad: toca em “Partilhar” → “Adicionar ao ecrã principal”.', en: 'On iPhone/iPad: tap “Share” → “Add to Home Screen”.' },
  appInstallDesktopHint: { pt: 'Para instalar: abre no Chrome/Edge e usa “Instalar app” no menu/barra de endereço.', en: 'To install: open in Chrome/Edge and use “Install app” from the menu/address bar.' },
  tema: { pt: 'Tema', en: 'Theme' },
  som: { pt: 'Som', en: 'Sound' },
  soundAria: { pt: 'Ativar/desativar som', en: 'Toggle sound' },
  faq: { pt: 'FAQ', en: 'FAQ' },
  faqAria: { pt: 'Perguntas frequentes', en: 'Frequently asked questions' },
  faq1Q: { pt: 'Como faço login?', en: 'How do I log in?' },
  faq1A: { pt: 'Abre o menu <strong>Login</strong>, escreve o teu email e password, e confirma. Se ainda não existir conta, o sistema cria automaticamente (exemplo fictício).', en: 'Open the <strong>Login</strong> menu, enter your email and password, and confirm. If no account exists yet, the system creates one automatically (fictional example).' },
  faq2Q: { pt: 'Como alterar o tema (claro/escuro)?', en: 'How do I change the theme (light/dark)?' },
  faq2A: { pt: 'Vai em <strong>Configurações</strong> e muda o <strong>Tema</strong>. Ao estar conectado, o tema é guardado para a próxima vez (texto fictício).', en: 'Go to <strong>Settings</strong> and change the <strong>Theme</strong>. When connected, the theme is saved for next time (fictional text).' },
  faq3Q: { pt: 'Como ativar/desativar o som?', en: 'How do I enable/disable sound?' },
  faq3A: { pt: 'Em <strong>Configurações</strong>, clica no botão de <strong>Som</strong>. Exemplo: ao desativar, o ícone muda e o estado fica guardado.', en: 'In <strong>Settings</strong>, click the <strong>Sound</strong> button. Example: when disabled, the icon changes and the state is saved.' },
  faq4Q: { pt: 'Os meus dados ficam guardados?', en: 'Is my data saved?' },
  faq4A: { pt: 'Sim: as <strong>configurações</strong> ficam associadas ao teu email (texto fictício). As ferramentas podem ter comportamentos diferentes dependendo do módulo.', en: 'Yes: <strong>settings</strong> are associated with your email (fictional text). Tools may behave differently depending on the module.' },
  faq5Q: { pt: 'Posso abrir várias ferramentas ao mesmo tempo?', en: 'Can I open several tools at once?' },
  faq5A: { pt: 'Sim. Podes abrir mais do que um card e organizar no ecrã. Exemplo fictício: Pomodoro + TaskList lado a lado.', en: 'Yes. You can open more than one card and arrange them on screen. Fictional example: Pomodoro + TaskList side by side.' },
  faq6Q: { pt: 'Perdi a password. E agora?', en: 'I forgot my password. What now?' },
  faq6A: { pt: 'Exemplo fictício: clica em <strong>Forgot password?</strong> e segue as instruções. (Ainda pode ser uma funcionalidade futura.)', en: 'Fictional example: click <strong>Forgot password?</strong> and follow the instructions. (May be a future feature.)' },
  shortcutsBtn: { pt: '⌨️ Atalhos', en: '⌨️ Shortcuts' },
  shortcutsAria: { pt: 'Ver atalhos de teclado', en: 'View keyboard shortcuts' },
  contacto: { pt: 'Contacto', en: 'Contact' },
  contactoText: { pt: 'Entre em contacto!', en: 'Get in touch!' },
  login: { pt: 'Login', en: 'Login' },
  navToggleAria: { pt: 'Alternar menu de navegação', en: 'Toggle navigation menu' },
  dropdownClose: { pt: 'Fechar', en: 'Close' },
  pomodoro: { pt: 'Pomodoro', en: 'Pomodoro' },
  timer: { pt: 'Timer', en: 'Timer' },
  stopwatch: { pt: 'Cronómetro', en: 'Stopwatch' },
  tasklist: { pt: 'TaskList', en: 'TaskList' },
  countdown: { pt: 'Countdown', en: 'Countdown' },
  worldClock: { pt: 'World Clock', en: 'World Clock' },
  pomodoroTitle: { pt: 'Pomodoro Timer', en: 'Pomodoro Timer' },
  timerTitle: { pt: 'Timer', en: 'Timer' },
  stopwatchTitle: { pt: 'Cronómetro', en: 'Stopwatch' },
  tasklistTitle: { pt: 'Task List', en: 'Task List' },
  countdownTitle: { pt: 'Countdown', en: 'Countdown' },
  worldclockTitle: { pt: 'World Clock', en: 'World Clock' },
  workMin: { pt: 'Tempo de trabalho em minutos', en: 'Work time in minutes' },
  breakMin: { pt: 'Tempo de pausa em minutos', en: 'Break time in minutes' },
  start: { pt: 'Start', en: 'Start' },
  stop: { pt: 'Stop', en: 'Stop' },
  reset: { pt: 'Reset', en: 'Reset' },
  add: { pt: 'Add', en: 'Add' },
  lap: { pt: 'Lap', en: 'Lap' },
  taskPlaceholder: { pt: 'Adicionar nova tarefa...', en: 'Add a new task...' },
  taskLabel: { pt: 'Nova tarefa', en: 'New task' },
  addTaskAria: { pt: 'Adicionar tarefa', en: 'Add task' },
  countdownLabelPlaceholder: { pt: 'Título (opcional)', en: 'Title (optional)' },
  countdownLabelAria: { pt: 'Nome do countdown', en: 'Countdown name' },
  countdownDateAria: { pt: 'Data e hora de destino', en: 'Target date and time' },
  addCountdownAria: { pt: 'Adicionar countdown', en: 'Add countdown' },
  resetCountdownAria: { pt: 'Resetar todos os countdowns', en: 'Reset all countdowns' },
  countdownQuickPicksLabel: { pt: 'Sugestões rápidas de duração', en: 'Quick duration suggestions' },
  countdownQuick1m: { pt: '1 min', en: '1 min' },
  countdownQuick10m: { pt: '10 min', en: '10 min' },
  countdownQuick15m: { pt: '15 min', en: '15 min' },
  countdownQuick20m: { pt: '20 min', en: '20 min' },
  countdownQuick30m: { pt: '30 min', en: '30 min' },
  countdownQuick45m: { pt: '45 min', en: '45 min' },
  countdownQuick1h: { pt: '1 h', en: '1 h' },
  countdownQuick2h: { pt: '2 h', en: '2 h' },
  timezoneAria: { pt: 'Selecionar fuso horário', en: 'Select timezone' },
  addTimezoneAria: { pt: 'Adicionar fuso horário', en: 'Add timezone' },
  minutes: { pt: 'Minutos', en: 'Minutes' },
  seconds: { pt: 'Segundos', en: 'Seconds' },
  timeRemaining: { pt: 'Tempo restante', en: 'Time remaining' },
  elapsed: { pt: 'Tempo decorrido', en: 'Elapsed time' },
  closePomodoro: { pt: 'Fechar Pomodoro Timer', en: 'Close Pomodoro Timer' },
  closeTimer: { pt: 'Fechar Timer', en: 'Close Timer' },
  closeStopwatch: { pt: 'Fechar Cronómetro', en: 'Close Stopwatch' },
  closeTasklist: { pt: 'Fechar Lista de Tarefas', en: 'Close Task List' },
  closeCountdown: { pt: 'Fechar Contagem Regressiva', en: 'Close Countdown' },
  closeWorldclock: { pt: 'Fechar Relógio Mundial', en: 'Close World Clock' },
  entrar: { pt: 'Entrar', en: 'Log in' },
  criarConta: { pt: 'Criar conta', en: 'Create account' },
  loginSubtitle: { pt: 'Acesse sua conta para sincronizar suas configurações.', en: 'Access your account to sync your settings.' },
  rememberMe: { pt: 'Lembrar-me', en: 'Remember me' },
  forgotPassword: { pt: 'Forgot password?', en: 'Forgot password?' },
  confirmPassword: { pt: 'Confirmar password', en: 'Confirm password' },
  showPassword: { pt: 'Mostrar', en: 'Show' },
  showPasswordAria: { pt: 'Mostrar password', en: 'Show password' },
  hidePassword: { pt: 'Ocultar', en: 'Hide' },
  hidePasswordAria: { pt: 'Ocultar password', en: 'Hide password' },
  hidePasswordConfirmAria: { pt: 'Ocultar confirmação de password', en: 'Hide password confirmation' },
  orContinue: { pt: 'ou continuar com', en: 'or continue with' },
  showPasswordConfirmAria: { pt: 'Mostrar confirmação de password', en: 'Show password confirmation' },
  signUp: { pt: 'Criar conta', en: 'Sign up' },
  noAccount: { pt: "Don't have an account?", en: "Don't have an account?" },
  connected: { pt: 'Conectado', en: 'Connected' },
  connectedMsg: { pt: 'Você está conectado!', en: "You're connected!" },
  ok: { pt: 'Ok', en: 'Ok' },
  signOut: { pt: 'Sair', en: 'Sign out' },
  closeLogin: { pt: 'Fechar Login', en: 'Close Login' },
  footer: { pt: '© 2026 StuddyBuddy. Desenvolvido por Mariana Lima.', en: '© 2026 StuddyBuddy. Developed by Mariana Lima.' },
  cookies: { pt: 'Cookies', en: 'Cookies' },
  cookieText: { pt: 'Usamos cookies essenciais para o funcionamento do site e cookies de preferência para guardar opções como tema e som.', en: 'We use essential cookies for site functionality and preference cookies to save options like theme and sound.' },
  accept: { pt: 'Aceitar', en: 'Accept' },
  reject: { pt: 'Recusar', en: 'Reject' },
  shortcutsTitle: { pt: 'Atalhos de teclado', en: 'Keyboard shortcuts' },
  shortcutsCloseAria: { pt: 'Fechar', en: 'Close' },
  shortcutStopwatch: { pt: 'Cronómetro', en: 'Stopwatch' },
  shortcutTheme: { pt: 'Alternar tema', en: 'Toggle theme' },
  shortcutShortcuts: { pt: 'Ver atalhos', en: 'View shortcuts' },
  shortcutCloseCards: { pt: 'Fechar cards', en: 'Close cards' },
  langLabel: { pt: 'Idioma', en: 'Language' },
  langBtn: { pt: '🌐 PT', en: '🌐 EN' },
  langBtnAria: { pt: 'Mudar idioma para Inglês', en: 'Change language to Portuguese' },
  account: { pt: 'Conta', en: 'Account' },
  statsTitle: { pt: 'Estatísticas de estudo', en: 'Study statistics' },
  statsToday: { pt: 'Hoje:', en: 'Today:' },
  statsWeek: { pt: 'Últimos 7 dias:', en: 'Last 7 days:' },
  statsTotal: { pt: 'Total:', en: 'Total:' },
  statsSessions: { pt: 'Sessões:', en: 'Sessions:' },
  // Pomodoro break wellness reminders
  pomoBreakTitle: { pt: 'Pausa!', en: 'Break time!' },
  pomoBreakBody: { pt: 'Tempo de descanso. Aproveita para cuidar de ti!', en: 'Time to rest. Take care of yourself!' },
  pomoReminderWater: { pt: '💧 Bebe água', en: '💧 Drink water' },
  pomoReminderStretch: { pt: '🤸 Alonga-te', en: '🤸 Stretch' },
  pomoReminderEat: { pt: '🍎 Come algo saudável', en: '🍎 Eat something healthy' },
  pomoBreakWellness: { pt: 'Pausa! Bebe água • Alonga-te • Come algo saudável', en: 'Break! Drink water • Stretch • Eat something healthy' },
  pomoWorkTitle: { pt: 'Tempo de trabalho!', en: 'Work time!' },
  pomoWorkBody: { pt: 'Mantém o foco!', en: 'Stay focused!' },
  pomoWorkToast: { pt: 'Hora de trabalhar! Mantém o foco!', en: 'Work time! Stay focused!' },
};

function getLang() {
  if (currentLang === 'en' || currentLang === 'pt') return currentLang;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'pt') return stored;
  } catch (_) {}
  return 'pt';
}

function setLang(lang) {
  if (lang !== 'pt' && lang !== 'en') return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {}
}

function tr(key, lang = getLang()) {
  const entry = t[key];
  if (!entry) return '';
  return entry[lang] ?? entry.pt ?? '';
}

function applyLanguage() {
  const lang = getLang();
  document.documentElement.lang = lang === 'pt' ? 'pt-PT' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (el.id === 'loginButton' && isAuthenticated()) {
      const raw = formatUserLabel(getStoredUserEmail());
      el.textContent = raw === 'Conta' ? tr('account') : raw;
      el.setAttribute('aria-label', `${tr('account')}: ${getStoredUserEmail()}`);
      return;
    }
    const text = tr(key);
    if (text && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
      if (/^faq\dA$/.test(key)) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = tr(key);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const val = tr(key);
    if (val) el.setAttribute('aria-label', val);
  });

  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    // Show the target language (more intuitive): PT → EN, EN → PT
    langBtn.textContent = lang === 'pt' ? '🌐 EN' : '🌐 PT';
    langBtn.setAttribute('aria-label', tr('langBtnAria'));
  }

  document.dispatchEvent(new CustomEvent('i18n-changed', { detail: { lang } }));
}

function toggleLanguage() {
  const next = getLang() === 'pt' ? 'en' : 'pt';
  setLang(next);
  applyLanguage();
}

function initLanguageToggle() {
  const btn = document.getElementById('langBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLanguage();
  });
  applyLanguage();
  document.addEventListener('login-success', applyLanguage);
}

export { getLang, setLang, tr, applyLanguage, initLanguageToggle };
