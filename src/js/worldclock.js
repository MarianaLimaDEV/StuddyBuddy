/**
 * World Clock Module
 * Displays multiple timezones with local storage persistence
 */
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
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.addTimezone();
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
      this.showFeedback('Por favor, selecione um fuso horário', 'warning');
      return;
    }

    // Check for duplicates
    const exists = this.timezones.find(t => t.tz === tz);
    if (exists) {
      this.showFeedback('Este fuso horário já está na lista', 'warning');
      return;
    }

    // Add timezone
    this.timezones.push({ tz, name: tzName });
    this.save();
    this.render();
    this.showFeedback('Fuso horário adicionado!', 'success');
  }

  removeTimezone(tz) {
    const tzIndex = this.timezones.findIndex(t => t.tz === tz);
    if (tzIndex === -1) return;

    this.timezones.splice(tzIndex, 1);
    this.save();
    this.render();
    this.showFeedback('Fuso horário removido', 'success');
  }

  save() {
    try {
      localStorage.setItem('worldClockTimezones', JSON.stringify(this.timezones));
    } catch (error) {
      console.warn('Failed to save timezones to localStorage:', error);
      this.showFeedback('Falha ao guardar fusos horários. O armazenamento pode estar cheio.', 'error');
    }
  }

  /**
   * Show user feedback notification
   * @param {string} message - Message to display
   * @param {string} type - Notification type: 'success', 'warning', 'error'
   */
  showFeedback(message, type = 'success') {
    const feedback = document.createElement('div');
    feedback.className = `feedback feedback-${type}`;
    feedback.setAttribute('role', 'alert');
    feedback.setAttribute('aria-live', 'polite');
    feedback.textContent = message;

    const colors = {
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--danger)'
    };

    feedback.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background-color: ${colors[type] || colors.success};
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(feedback);

    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
    });

    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => feedback.remove(), 300);
    }, 3000);
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
        <div class="timezone-item" role="listitem">
          <span class="tz-name">${name}</span>
          <span class="tz-time" aria-label="Hora em ${name}">${time}</span>
          <button class="delete-btn" aria-label="Remover ${name}" onclick="worldClockInstance.removeTimezone('${tz}')">×</button>
        </div>
      `;
    }).join('');
  }
}

