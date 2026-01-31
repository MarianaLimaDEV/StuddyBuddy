import { showNotification } from './utils.js';

const STORAGE_KEY = 'chatbotHistory';

// Em dev, usar URL direta do backend para funcionar mesmo sem proxy (ex: Live Preview noutra porta)
const API_BASE = import.meta.env?.DEV ? (import.meta.env?.VITE_API_BASE ?? 'http://localhost:3001') : (import.meta.env?.VITE_API_BASE ?? '');

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function makeBotReply(userText) {
  const t = normalize(userText);

  if (!t) return 'Escreve uma pergunta e eu tento ajudar.';
  if (/(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t)) return 'Oi! Posso te ajudar com o StuddyBuddy. Quer saber sobre login, tema, som ou alguma ferramenta?';
  if (/(login|entrar|sign in)/.test(t)) return 'Para entrar: abre “Login”, escolhe a aba “Entrar”, e coloca email + password.';
  if (/(criar conta|cadastro|regist|sign up)/.test(t)) return 'Para criar conta: abre “Login”, vai em “Criar conta” e confirma a password (mín. 8 caracteres).';
  if (/(tema|dark|claro|escuro|light)/.test(t)) return 'O tema fica em Configurações → Tema. Se você estiver conectado, ele fica guardado na sua conta.';
  if (/(som|audio|mute|silenciar)/.test(t)) return 'O som fica em Configurações → Som. Se estiver conectado, também sincroniza na sua conta.';
  if (/(pomodoro)/.test(t)) return 'Pomodoro: define trabalho/pausa e usa Start/Stop/Reset. Dá pra deixar aberto junto com outras ferramentas.';
  if (/(taref|task)/.test(t)) return 'Task List: adiciona tarefas e marca como concluídas. Ela tenta sincronizar com o backend (/api/tasks).';
  if (/(world|fuso|timezone)/.test(t)) return 'World Clock: escolhe um fuso horário e clica em Add. Dá pra remover pelo X.';
  if (/(countdown|data|hora)/.test(t)) return 'Countdown: define título e data/hora, depois Add. Você pode ter vários countdowns.';
  if (/(cookies?)/.test(t)) return 'Cookies: usamos para preferências (tema/som) e para manter sua sessão. Você pode aceitar ou recusar no banner.';
  if (/(erro|bug|nao funciona|não funciona)/.test(t)) return 'Me diz o que aconteceu e em que parte (login, navbar, cards). Se puder, cola a mensagem do erro.';

  return 'Não entendi totalmente. Você pode reformular ou dizer qual parte do site (login, tema, som, pomodoro, tasks, world clock, countdown)?';
}

async function askServerAI({ message, history }) {
  const url = `${API_BASE}/api/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    throw new Error(`Chat API error (${res.status})`);
  }
  const data = await res.json();
  if (!data?.reply) throw new Error('Chat API invalid reply');
  return String(data.reply);
}

function renderMessage(container, { role, text }) {
  const el = document.createElement('div');
  el.className = `chatbot-msg chatbot-msg--${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

export function initChatbot() {
  const fab = document.getElementById('chatbotFab');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const list = document.getElementById('chatbotMessages');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');

  if (!fab || !panel || !closeBtn || !list || !form || !input) return;

  let lastFocused = null;

  const show = () => {
    lastFocused = document.activeElement;
    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    input.focus();
  };

  const hide = () => {
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  };

  // Load history
  let history = [];
  try {
    history = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  } catch {
    history = [];
  }

  if (!history.length) {
    history = [{ role: 'bot', text: 'Oi! Eu sou o assistente do StuddyBuddy. Como posso ajudar?' }];
  }

  list.innerHTML = '';
  history.forEach(m => renderMessage(list, m));

  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40))); } catch { /* ignore */ }
  };

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.contains('hidden') ? show() : hide();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hide();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      hide();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    history.push({ role: 'user', text });
    renderMessage(list, { role: 'user', text });
    input.value = '';

    const typing = { role: 'bot', text: 'Digitando…' };
    renderMessage(list, typing);

    // build small chat history for the API
    const apiHistory = history
      .slice(-10)
      .map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));

    try {
      const reply = await askServerAI({ message: text, history: apiHistory });
      // replace typing bubble
      list.lastElementChild?.remove();
      history.push({ role: 'bot', text: reply });
      renderMessage(list, { role: 'bot', text: reply });
    } catch (err) {
      // fallback to local rules (no API configured / failed)
      list.lastElementChild?.remove();
      const reply = makeBotReply(text);
      history.push({ role: 'bot', text: reply });
      renderMessage(list, { role: 'bot', text: reply });
    } finally {
      persist();
    }
  });

  // Small UX hint on first load
  try {
    if (!sessionStorage.getItem('chatbotHintShown')) {
      sessionStorage.setItem('chatbotHintShown', 'true');
      showNotification('Dica: clique no botão de chat se precisar de ajuda.', 'info', 2000, false);
    }
  } catch {
    // ignore
  }
}

