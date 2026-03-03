/**
 * World Clock Module
 * Uses Network-First strategy: fetches from API when online, falls back to IndexedDB/localStorage
 * Supports authenticated users with JWT sync
 */
import { showNotification } from './utils.js';
import { playSound } from './sound.js';
import { authFetch, apiUrl } from './api-base.js';
import { isAuthenticated } from './utils.js';

const WORLDCLOCK_API_URL = apiUrl('/api/worldclock');
const STORAGE_KEY = 'worldClockTimezones';

export class WorldClock {
  constructor() {
    this.timezones = [];
    this.timeFormatters = new Map();
    this.lastUpdate = 0;
    this.updateInterval = 1000; // Update every second
    this.animationFrameId = null;
    this.isRunning = false;
    this.init();
  }

  init() {
    // Pre-create formatters (will be populated after load)
    const addBtn = document.getElementById('addTimezoneBtn');
    const timezoneList = document.getElementById('timezoneList');
    
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTimezone();
      });
    }

    // Event delegation for delete buttons
    if (timezoneList) {
      timezoneList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="remove-tz"]');
        if (deleteBtn) {
          const tz = deleteBtn.dataset.tz;
          this.removeTimezone(tz);
        }
      });
    }

    // Load timezones using Network-First strategy
    this.loadTimezones();

    // Start the update loop
    this.startUpdateLoop();
    
    this.render();

    // Listen for login success to re-sync
    window.addEventListener('login-success', () => {
      this.loadTimezones();
    });
  }

  /**
   * Network-First: Try API, fall back to localStorage
   */
  async loadTimezones() {
    // First, try to load from localStorage for immediate display
    this.loadFromLocalStorage();

    // Then try network fetch if authenticated
    if (isAuthenticated()) {
      try {
        const res = await authFetch(WORLDCLOCK_API_URL);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Convert API response to local format
            this.timezones = data.map(t => ({
              tz: t.tz,
              name: t.name,
              _id: t._id
            }));
            this.saveToLocalStorage();
            this.updateFormatters();
            this.render();
          }
        }
      } catch (err) {
        console.warn('Failed to fetch timezones from API, using local data:', err);
      }
    }
  }

  /**
   * Load timezones from localStorage (fallback)
   */
  loadFromLocalStorage() {
    try {
      const storedTimezones = localStorage.getItem(STORAGE_KEY);
      this.timezones = storedTimezones ? JSON.parse(storedTimezones) : [];
    } catch (error) {
      console.warn('Failed to load timezones from localStorage:', error);
      this.timezones = [];
    }
    this.updateFormatters();
  }

  /**
   * Save timezones to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.timezones));
    } catch (error) {
      console.warn('Failed to save timezones to localStorage:', error);
      showNotification('Falha ao guardar fusos horários. O armazenamento pode estar cheio.', 'error');
    }
  }

  /**
   * Update formatters for all timezones
   */
  updateFormatters() {
    this.timezones.forEach(({ tz }) => this.getFormatter(tz));
  }

  /**
   * Get or create a cached Intl.DateTimeFormat formatter
   */
  getFormatter(tz) {
    if (!this.timeFormatters.has(tz)) {
      this.timeFormatters.set(tz, new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    }
    return this.timeFormatters.get(tz);
  }

  /**
   * Start the update loop using requestAnimationFrame
   */
  startUpdateLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const update = () => {
      const now = Date.now();
      if (now - this.lastUpdate >= this.updateInterval) {
        this.render();
        this.lastUpdate = now;
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }

  /**
   * Stop the update loop
   */
  stopUpdateLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRunning = false;
  }

  async addTimezone() {
    const select = document.getElementById('timezoneSelect');
    if (!select) return;

    const tz = select.value;
    const tzName = select.options[select.selectedIndex].text;

    // Validate timezone
    if (!tz) {
      showNotification('Por favor, selecione um fuso horário', 'warning');
      return;
    }

    // Check for duplicates
    const exists = this.timezones.find(t => t.tz === tz);
    if (exists) {
      showNotification('Este fuso horário já está na lista', 'warning');
      return;
    }

    // Add timezone locally first (optimistic)
    const newTimezone = { tz, name: tzName };
    this.timezones.push(newTimezone);
    this.getFormatter(tz);
    this.saveToLocalStorage();
    this.render();
    playSound('timezone_add');

    // Try to sync with server if authenticated
    if (isAuthenticated()) {
      try {
        const res = await authFetch(WORLDCLOCK_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tz, name: tzName })
        });
        
        if (!res.ok) {
          // Server said no, but we keep it locally
          console.warn('Server rejected timezone, keeping locally');
        }
      } catch (err) {
        console.warn('Failed to sync timezone to server, saved locally:', err);
        showNotification('Fuso horário guardado localmente; será sincronizado quando houver ligação.', 'info');
      }
    }
  }

  async removeTimezone(tz) {
    const tzIndex = this.timezones.findIndex(t => t.tz === tz);
    if (tzIndex === -1) return;

    // Remove locally first (optimistic)
    this.timezones.splice(tzIndex, 1);
    this.timeFormatters.delete(tz);
    this.saveToLocalStorage();
    this.render();
    playSound('timezone_remove');

    // Try to sync with server if authenticated
    if (isAuthenticated()) {
      try {
        const res = await authFetch(`${WORLDCLOCK_API_URL}/${tz}`, {
          method: 'DELETE'
        });
        
        if (!res.ok) {
          console.warn('Server rejected timezone deletion');
        }
      } catch (err) {
        console.warn('Failed to sync timezone deletion to server:', err);
      }
    }
  }

  save() {
    this.saveToLocalStorage();
  }

  render() {
    const list = document.getElementById('timezoneList');
    if (!list) return;

    // Don't re-render if nothing changed
    const shouldRender = this.timezones.length > 0;
    if (!shouldRender) {
      list.innerHTML = '<div class="empty-message">Nenhum fuso horário adicionado. Selecione um acima!</div>';
      return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    this.timezones.forEach(({ tz, name }) => {
      let time;
      try {
        const formatter = this.getFormatter(tz);
        time = formatter.format(new Date());
      } catch (error) {
        time = '--:--:--';
      }

      const item = document.createElement('div');
      item.className = 'timezone-item';
      item.setAttribute('role', 'listitem');
      item.dataset.tz = tz;
      
      item.innerHTML = `
        <span class="tz-name">${name}</span>
        <span class="tz-time" aria-label="Hora em ${name}">${time}</span>
        <button class="delete-btn" aria-label="Remover ${name}" data-action="remove-tz" data-tz="${tz}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      `;
      
      fragment.appendChild(item);
    });

    list.innerHTML = '';
    list.appendChild(fragment);
  }

  /**
   * Cleanup method to stop the update loop
   */
  destroy() {
    this.stopUpdateLoop();
    this.timeFormatters.clear();
  }
}

