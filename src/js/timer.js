/**
 * Simple Timer Module
 * Handles a basic countdown timer with customizable minutes and seconds
 */
import { showNotification } from './utils.js';
import { playSound, playSoundWithOverlap } from './sound.js';

export class SimpleTimer {
  constructor() {
    this.totalSeconds = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    this.interval = null;
    this.init();
  }

  init() {
    const startBtn = document.getElementById('timerStart');
    const stopBtn = document.getElementById('timerStop');
    const resetBtn = document.getElementById('timerReset');
    const minInput = document.getElementById('timerMinutes');
    const secInput = document.getElementById('timerSeconds');

    if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); this.start(); });
    if (stopBtn) stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stop(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.reset(); });
    if (minInput) minInput.addEventListener('change', () => this.updateTotal());
    if (secInput) secInput.addEventListener('change', () => this.updateTotal());
    // Inicializa o display com os valores atuais dos inputs
    this.updateTotal();
  }

  updateTotal() {
    // Guard against missing DOM nodes
    const minInput = document.getElementById('timerMinutes');
    const secInput = document.getElementById('timerSeconds');
    
    // Default values if elements or values are missing
    const mins = minInput?.value ? parseInt(minInput.value, 10) : 0;
    const secs = secInput?.value ? parseInt(secInput.value, 10) : 0;
    
    // Handle NaN from parseInt
    this.totalSeconds = (isNaN(mins) ? 0 : mins) * 60 + (isNaN(secs) ? 0 : secs);
    this.timeLeft = this.totalSeconds;
    this.updateDisplay();
  }

  start() {
    if (this.isRunning || this.timeLeft <= 0) return;
    this.isRunning = true;
    playSound('interact');
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      if (this.timeLeft <= 0) {
        this.stop();
        // Play alarm sound first (with overlap allowed so it can complete)
        playSoundWithOverlap('alarm');
        // Show notification without notification sound
        this.showCustomNotification('Timer finished!', 'success', 5000);
      }
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
    playSound('interact');
  }

  reset() {
    this.stop();
    this.timeLeft = this.totalSeconds;
    playSound('reset');
    this.updateDisplay();
  }

  updateDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) {
      console.warn('Timer display element not found');
      return;
    }
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Show notification without playing notification sound (for timer end)
   */
  showCustomNotification(message, type = 'success', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const colors = {
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--danger)',
      info: 'var(--primary)'
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      background-color: ${colors[type] || colors.success};
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: auto;
    `;

    container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

