/**
 * World Clock Module
 * Displays multiple timezones with local storage persistence
 */
import { showNotification } from './utils.js';

export class WorldClock {
  constructor() {
    this.timezones = [];
    this.init();
  }

  init() {
    // Load timezones from localStorage with error handling
    try {
      const storedTimezones = localStorage.getItem('worldClockTimezones');
      this.timezones = storedTimezones ? JSON.parse(storedTimezones) : [];
    } catch (error) {
      console.warn('Failed to load timezones from localStorage:', error);
      this.timezones = [];
    }

    // Setup event listeners
    setTimeout(() => {
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
    }, 100);

    // Update time display every second
    setInterval(() => this.render(), 1000);

    this.render();
  }

  addTimezone() {
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

    // Add timezone
    this.timezones.push({ tz, name: tzName });
    this.save();
    this.render();
    showNotification('Fuso horário adicionado!', 'success');
  }

  removeTimezone(tz) {
    const tzIndex = this.timezones.findIndex(t => t.tz === tz);
    if (tzIndex === -1) return;

    this.timezones.splice(tzIndex, 1);
    this.save();
    this.render();
    showNotification('Fuso horário removido', 'success');
  }

  save() {
    try {
      localStorage.setItem('worldClockTimezones', JSON.stringify(this.timezones));
    } catch (error) {
      console.warn('Failed to save timezones to localStorage:', error);
      showNotification('Falha ao guardar fusos horários. O armazenamento pode estar cheio.', 'error');
    }
  }

  render() {
    const list = document.getElementById('timezoneList');
    if (!list) return;

    list.innerHTML = '';

    if (this.timezones.length === 0) {
      list.innerHTML = '<div class="empty-message">Nenhum fuso horário adicionado. Selecione um acima!</div>';
      return;
    }

    list.innerHTML = this.timezones.map(({ tz, name }) => {
      let time;
      try {
        time = new Date().toLocaleString('en-US', { timeZone: tz });
      } catch (error) {
        time = 'Inválido';
      }

      return `
        <div class="timezone-item" role="listitem" data-tz="${tz}">
          <span class="tz-name">${name}</span>
          <span class="tz-time" aria-label="Hora em ${name}">${time}</span>
          <button class="delete-btn" aria-label="Remover ${name}" data-action="remove-tz" data-tz="${tz}">×</button>
        </div>
      `;
    }).join('');
  }
}

