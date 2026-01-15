/**
 * Countdown Timer Module
 * Handles a countdown to a specific date/time with local storage persistence
 */
export class CountdownTimer {
  constructor() {
    this.targetDate = null;
    this.interval = null;
    this.init();
  }

  init() {
    // Load saved target date from localStorage
    try {
      const savedDate = localStorage.getItem('countdownTargetDate');
      if (savedDate) {
        this.targetDate = new Date(savedDate);
      }
    } catch (error) {
      console.warn('Failed to load countdown date from localStorage:', error);
    }

    // Setup event listeners
    setTimeout(() => {
      const startBtn = document.getElementById('countdownStart');
      const stopBtn = document.getElementById('countdownStop');
      const dateInput = document.getElementById('countdownDate');

      if (startBtn) {
        startBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.start();
        });
      }

      if (stopBtn) {
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.stop();
        });
      }

      if (dateInput && this.targetDate) {
        // Set the input value to the saved date
        dateInput.value = this.formatDateTimeLocal(this.targetDate);
      }
    }, 100);

    // Start updating display if we have a target date
    if (this.targetDate) {
      this.start();
    }
  }

  formatDateTimeLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  start() {
    const dateInput = document.getElementById('countdownDate');
    if (!dateInput) return;

    const dateValue = dateInput.value;
    if (!dateValue) {
      this.showFeedback('Por favor, selecione uma data e hora', 'warning');
      return;
    }

    this.targetDate = new Date(dateValue);
    
    // Save to localStorage
    try {
      localStorage.setItem('countdownTargetDate', this.targetDate.toISOString());
    } catch (error) {
      console.warn('Failed to save countdown date:', error);
    }

    // Clear any existing interval
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Update display immediately
    this.updateDisplay();

    // Start interval
    this.interval = setInterval(() => {
      this.updateDisplay();
    }, 1000);

    this.showFeedback('Contagem regressiva iniciada!', 'success');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.showFeedback('Contagem regressiva parada', 'success');
  }

  updateDisplay() {
    const display = document.getElementById('countdownDisplay');
    if (!display || !this.targetDate) return;

    const now = new Date().getTime();
    const distance = this.targetDate.getTime() - now;

    if (distance < 0) {
      display.textContent = '00:00:00:00';
      this.stop();
      this.showFeedback('A contagem regressiva terminou!', 'success');
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    display.textContent = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
}

