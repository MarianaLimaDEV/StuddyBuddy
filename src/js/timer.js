/**
 * Simple Timer Module
 * Handles a basic countdown timer with customizable minutes and seconds
 */
import { showNotification } from './utils.js';

export class SimpleTimer {
  constructor() {
    this.totalSeconds = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    this.interval = null;
    this.init();
  }

  init() {
    setTimeout(() => {
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
    }, 100);
    // Defer updateTotal() until DOM is ready to avoid null elements
    setTimeout(() => this.updateTotal(), 150);
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
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      if (this.timeLeft <= 0) {
        this.stop();
        showNotification('Timer finished!', 'success', 5000);
      }
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
  }

  reset() {
    this.stop();
    this.timeLeft = this.totalSeconds;
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
}

