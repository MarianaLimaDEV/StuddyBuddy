/**
 * Pomodoro Timer Module
 * Handles the Pomodoro timer functionality with work/break cycles
 */
import { showCustomNotification } from './utils.js';
import { playSound, playSoundWithOverlap } from './sound.js';

// Constants
const POMODORO_UPDATE_INTERVAL = 1000; // 1 second
const DEFAULT_WORK_TIME = 25;
const DEFAULT_BREAK_TIME = 5;
const MAX_WORK_TIME = 60;
const MAX_BREAK_TIME = 30;

export class PomodoroTimer {
  constructor() {
    this.workTime = DEFAULT_WORK_TIME;
    this.breakTime = DEFAULT_BREAK_TIME;
    this.timeLeft = DEFAULT_WORK_TIME * 60;
    this.isRunning = false;
    this.isBreak = false;
    this.interval = null;
    // Cache DOM elements
    this.elements = {};
    this.init();
  }

  init() {
    // Cache DOM elements for better performance
    this.elements.workInput = document.getElementById('pomodoroWork');
    this.elements.breakInput = document.getElementById('pomodoroBreak');
    this.elements.startBtn = document.getElementById('pomodoroStart');
    this.elements.stopBtn = document.getElementById('pomodoroStop');
    this.elements.resetBtn = document.getElementById('pomodoroReset');
    this.elements.display = document.getElementById('pomodoroDisplay');

    if (this.elements.workInput) {
      this.elements.workInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        // Validate: must be positive integer, default to DEFAULT_WORK_TIME if invalid
        if (isNaN(value) || value <= 0) {
          this.workTime = DEFAULT_WORK_TIME;
          e.target.value = DEFAULT_WORK_TIME;
        } else if (value > MAX_WORK_TIME) {
          this.workTime = MAX_WORK_TIME;
          e.target.value = MAX_WORK_TIME;
        } else {
          this.workTime = value;
        }
        if (!this.isRunning) this.reset();
      });
    }
    if (this.elements.breakInput) {
      this.elements.breakInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        // Validate: must be positive integer, default to DEFAULT_BREAK_TIME if invalid
        if (isNaN(value) || value <= 0) {
          this.breakTime = DEFAULT_BREAK_TIME;
          e.target.value = DEFAULT_BREAK_TIME;
        } else if (value > MAX_BREAK_TIME) {
          this.breakTime = MAX_BREAK_TIME;
          e.target.value = MAX_BREAK_TIME;
        } else {
          this.breakTime = value;
        }
      });
    }
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
    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    playSound('click');
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
        showCustomNotification(
          this.isBreak ? 'Break time! Ready to focus?' : 'Work time! Stay focused!', 
          'info', 
          5000
        );
      } else {
        this.updateDisplay();
      }
    }, POMODORO_UPDATE_INTERVAL);
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
    this.timeLeft = this.workTime * 60;
    this.isBreak = false;
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

