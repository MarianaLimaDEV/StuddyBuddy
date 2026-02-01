/**
 * Simple Timer Module
 * Handles a basic countdown timer with customizable minutes and seconds
 */
import { showCustomNotification } from './utils.js';
import { playSound, playSoundWithOverlap } from './sound.js';

function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/SB_B.png' });
  } catch (_) {}
}

// Constants
const TIMER_UPDATE_INTERVAL = 1000; // 1 second

export class SimpleTimer {
  constructor() {
    this.totalSeconds = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    this.interval = null;
    // Cache DOM elements
    this.elements = {};
    this.init();
  }

  init() {
    // Cache DOM elements for better performance
    this.elements.startBtn = document.getElementById('timerStart');
    this.elements.stopBtn = document.getElementById('timerStop');
    this.elements.resetBtn = document.getElementById('timerReset');
    this.elements.minInput = document.getElementById('timerMinutes');
    this.elements.secInput = document.getElementById('timerSeconds');
    this.elements.display = document.getElementById('timerDisplay');

    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        this.start(); 
      });
    }
    if (this.elements.stopBtn) {
      this.elements.stopBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        this.stop(); 
      });
    }
    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        this.reset(); 
      });
    }
    if (this.elements.minInput) {
      this.elements.minInput.addEventListener('change', () => this.updateTotal());
    }
    if (this.elements.secInput) {
      this.elements.secInput.addEventListener('change', () => this.updateTotal());
    }
    // Initialize display with current input values
    this.updateTotal();
  }

  updateTotal() {
    // Use cached elements
    const minInput = this.elements.minInput;
    const secInput = this.elements.secInput;
    
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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    this.isRunning = true;
    playSound('click');
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      if (this.timeLeft <= 0) {
        this.stop();
        playSoundWithOverlap('alarm');
        showBrowserNotification('Timer finished!', 'O teu temporizador terminou.');
        showCustomNotification('Timer finished!', 'success', 5000);
      }
    }, TIMER_UPDATE_INTERVAL);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    playSound('reset');
  }

  reset() {
    this.stop();
    this.timeLeft = this.totalSeconds;
    playSound('reset');
    this.updateDisplay();
  }

  updateDisplay() {
    const display = this.elements.display;
    if (!display) return;
    
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Cleanup method to clear interval when component is destroyed
   */
  destroy() {
    this.stop();
  }
}

