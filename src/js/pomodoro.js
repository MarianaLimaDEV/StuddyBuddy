/**
 * Pomodoro Timer Module
 * Handles the Pomodoro timer functionality with work/break cycles
 */
import { showNotification } from './utils.js';
import { playSound, playSoundWithOverlap } from './sound.js';

export class PomodoroTimer {
  constructor() {
    this.workTime = 25;
    this.breakTime = 5;
    this.timeLeft = 25 * 60;
    this.isRunning = false;
    this.isBreak = false;
    this.interval = null;
    this.init();
  }

  init() {
    const workInput = document.getElementById('pomodoroWork');
    const breakInput = document.getElementById('pomodoroBreak');
    const startBtn = document.getElementById('pomodoroStart');
    const stopBtn = document.getElementById('pomodoroStop');
    const resetBtn = document.getElementById('pomodoroReset');

    if (workInput) {
      workInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        // Validate: must be positive integer, default to 25 if invalid
        if (isNaN(value) || value <= 0) {
          this.workTime = 25;
          e.target.value = 25;
        } else if (value > 60) {
          this.workTime = 60;
          e.target.value = 60;
        } else {
          this.workTime = value;
        }
        if (!this.isRunning) this.reset();
      });
    }
    if (breakInput) {
      breakInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        // Validate: must be positive integer, default to 5 if invalid
        if (isNaN(value) || value <= 0) {
          this.breakTime = 5;
          e.target.value = 5;
        } else if (value > 30) {
          this.breakTime = 30;
          e.target.value = 30;
        } else {
          this.breakTime = value;
        }
      });
    }
    if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); this.start(); });
    if (stopBtn) stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stop(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.reset(); });
    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    playSound('interact');
    this.interval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        // Flip the break state first
        this.isBreak = !this.isBreak;
        // Reset timeLeft to the appropriate duration
        this.timeLeft = (this.isBreak ? this.breakTime : this.workTime) * 60;
        // Update display to show the corrected (non-negative) value
        this.updateDisplay();
        // Play alarm sound first (with overlap allowed so it can complete)
        playSoundWithOverlap('alarm');
        // Then show notification (without playing notification sound)
        this.showCustomNotification(this.isBreak ? 'Break time! Ready to focus?' : 'Work time! Stay focused!', 'info', 5000);
      } else {
        this.updateDisplay();
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
    this.timeLeft = this.workTime * 60;
    this.isBreak = false;
    playSound('reset');
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const el = document.getElementById('pomodoroDisplay');
    if (el) {
      el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
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

