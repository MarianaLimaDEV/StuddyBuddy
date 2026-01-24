/**
 * Countdown Timer Module
 * Handles multiple countdowns with local storage persistence
 */
import { showNotification, showCustomNotification } from './utils.js';
import { playSound, playSoundWithOverlap } from './sound.js';

// Constants
const UPDATE_INTERVAL = 1000; // 1 second
const STORAGE_LIST_KEY = 'countdowns';
const STORAGE_LEGACY_DATE_KEY = 'countdownTargetDate';
const STORAGE_LEGACY_ACTIVE_KEY = 'countdownActive';

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function formatRemaining(ms) {
  const total = Math.max(0, ms);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class CountdownTimer {
  constructor() {
    this.countdowns = [];
    this.interval = null;
    this.elements = {};
    this.init();
  }

  init() {
    // Cache DOM elements
    this.elements.addBtn = document.getElementById('countdownAdd');
    this.elements.resetAllBtn = document.getElementById('countdownResetAll');
    this.elements.dateInput = document.getElementById('countdownDate');
    this.elements.labelInput = document.getElementById('countdownLabel');
    this.elements.list = document.getElementById('countdownList');

    // Load countdowns (and migrate legacy single countdown if present)
    this.load();

    if (this.elements.addBtn) {
      this.elements.addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addCountdown();
      });
    }

    if (this.elements.resetAllBtn) {
      this.elements.resetAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetAll();
      });
    }

    // Event delegation for remove
    if (this.elements.list) {
      this.elements.list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-countdown"]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (id) this.removeCountdown(id);
      });
    }

    this.render();
    this.startLoop();
  }

  load() {
    // Migration: old single countdown -> list
    try {
      const legacyDate = localStorage.getItem(STORAGE_LEGACY_DATE_KEY);
      if (legacyDate) {
        const legacyActive = localStorage.getItem(STORAGE_LEGACY_ACTIVE_KEY) === 'true';
        const id = makeId();
        this.countdowns = [
          {
            id,
            label: 'Countdown',
            targetISO: legacyDate,
            active: Boolean(legacyActive),
            createdAt: Date.now()
          }
        ];
        localStorage.removeItem(STORAGE_LEGACY_DATE_KEY);
        localStorage.removeItem(STORAGE_LEGACY_ACTIVE_KEY);
        localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(this.countdowns));
      }
    } catch {
      // ignore
    }

    try {
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      const list = safeJsonParse(raw, []);
      this.countdowns = Array.isArray(list) ? list : [];
    } catch {
      this.countdowns = [];
    }

    // If any active countdown is already in the past on load, mark it completed silently
    const now = Date.now();
    let changed = false;
    this.countdowns.forEach((c) => {
      if (c?.active) {
        const t = new Date(c.targetISO).getTime();
        if (!Number.isFinite(t) || t <= now) {
          c.active = false;
          c.completedAt = now;
          changed = true;
        }
      }
    });
    if (changed) this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(this.countdowns));
    } catch (e) {
      // ignore
    }
  }

  addCountdown() {
    const dateInput = this.elements.dateInput;
    if (!dateInput) return;

    const dateValue = dateInput.value;
    if (!dateValue) {
      showNotification('Por favor, selecione uma data e hora', 'warning');
      return;
    }

    const target = new Date(dateValue);
    const targetTime = target.getTime();
    if (!Number.isFinite(targetTime)) {
      showNotification('Data inválida. Tenta novamente.', 'warning');
      return;
    }

    const label = (this.elements.labelInput?.value || '').trim();
    const id = makeId();

    this.countdowns.push({
      id,
      label: label || 'Countdown',
      targetISO: target.toISOString(),
      active: true,
      createdAt: Date.now()
    });

    // Clear inputs for convenience
    if (this.elements.labelInput) this.elements.labelInput.value = '';
    dateInput.value = '';

    this.save();
    this.render();
    playSound('open');
  }

  removeCountdown(id) {
    const before = this.countdowns.length;
    this.countdowns = this.countdowns.filter((c) => c.id !== id);
    if (this.countdowns.length !== before) {
      this.save();
      this.render();
      playSound('close');
    }
  }

  resetAll() {
    if (!this.countdowns.length) return;
    this.countdowns = [];
    this.save();
    this.render();
    playSound('reset');
  }

  startLoop() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.tick();
    }, UPDATE_INTERVAL);
  }

  tick() {
    if (!this.countdowns.length) return;

    const now = Date.now();
    let changed = false;

    for (const c of this.countdowns) {
      if (!c.active) continue;
      const t = new Date(c.targetISO).getTime();
      if (!Number.isFinite(t)) {
        c.active = false;
        c.completedAt = now;
        changed = true;
        continue;
      }
      if (t <= now) {
        c.active = false;
        c.completedAt = now;
        changed = true;

        // Notify only at the moment it finishes (not on refresh)
        playSoundWithOverlap('alarm');
        const name = c.label || 'A contagem regressiva';
        showCustomNotification(`${name} terminou!`, 'success', 5000);
      }
    }

    if (changed) this.save();
    this.render();
  }

  render() {
    const listEl = this.elements.list;
    if (!listEl) return;

    if (!this.countdowns.length) {
      listEl.innerHTML = '<div class="empty-message">Nenhum countdown ainda. Adiciona um acima!</div>';
      return;
    }

    const now = Date.now();
    const fragment = document.createDocumentFragment();

    for (const c of this.countdowns) {
      const targetTime = new Date(c.targetISO).getTime();
      const remaining = Number.isFinite(targetTime) ? (targetTime - now) : 0;
      const timeText = c.active ? formatRemaining(remaining) : '00:00:00:00';

      const item = document.createElement('div');
      item.className = `countdown-item ${c.active ? '' : 'is-done'}`.trim();
      item.setAttribute('role', 'listitem');
      item.dataset.id = c.id;

      // Build nodes safely (avoid interpolating user-controlled label into HTML)
      const nameEl = document.createElement('span');
      nameEl.className = 'cd-name';
      nameEl.textContent = c.label || 'Countdown';

      const timeEl = document.createElement('span');
      timeEl.className = 'cd-time';
      timeEl.setAttribute('aria-label', 'Tempo restante');
      timeEl.textContent = timeText;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('data-action', 'remove-countdown');
      deleteBtn.setAttribute('data-id', c.id);
      deleteBtn.setAttribute('aria-label', `Remover ${c.label || 'countdown'}`);
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

      item.appendChild(nameEl);
      item.appendChild(timeEl);
      item.appendChild(deleteBtn);

      fragment.appendChild(item);
    }

    listEl.innerHTML = '';
    listEl.appendChild(fragment);
  }

  /**
   * Cleanup method to clear interval when component is destroyed
   */
  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

