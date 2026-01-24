/**
 * Stopwatch Module
 * Handles a stopwatch timer with lap functionality
 */
import { playSound } from './sound.js';

// Constants
const STOPWATCH_UPDATE_INTERVAL = 10; // 10ms for smooth display
const MS_PER_MINUTE = 60000;
const MS_PER_SECOND = 1000;
const CENTISECONDS_PER_SECOND = 100;

export class Stopwatch {
  constructor() {
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.interval = null;
    this.laps = [];
    // Cache DOM elements
    this.elements = {};
    this.init();
  }

  init() {
    // Cache DOM elements
    this.elements.startBtn = document.getElementById('stopwatchStart');
    this.elements.stopBtn = document.getElementById('stopwatchStop');
    this.elements.resetBtn = document.getElementById('stopwatchReset');
    this.elements.lapBtn = document.getElementById('stopwatchLap');
    this.elements.display = document.getElementById('stopwatchDisplay');
    this.elements.lapsList = document.getElementById('stopwatchLaps');

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
    if (this.elements.lapBtn) {
      this.elements.lapBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        this.lap(); 
      });
    }

    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now() - this.elapsedTime;
    playSound('click');
    this.interval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay();
    }, STOPWATCH_UPDATE_INTERVAL);
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
    this.elapsedTime = 0;
    this.laps = [];
    this.updateDisplay();
    this.renderLaps();
  }

  lap() {
    if (!this.isRunning) return;
    const lapTime = this.elapsedTime;
    const lapNumber = this.laps.length + 1;
    this.laps.push({ number: lapNumber, time: lapTime });
    playSound('click');
    this.renderLaps();
  }

  updateDisplay() {
    const display = this.elements.display;
    if (!display) return;

    const totalMs = this.elapsedTime;
    const minutes = Math.floor(totalMs / MS_PER_MINUTE);
    const seconds = Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND);
    const centiseconds = Math.floor((totalMs % MS_PER_SECOND) / CENTISECONDS_PER_SECOND);

    display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  formatLapTime(ms) {
    const minutes = Math.floor(ms / MS_PER_MINUTE);
    const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
    const centiseconds = Math.floor((ms % MS_PER_SECOND) / CENTISECONDS_PER_SECOND);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  renderLaps() {
    const lapsList = this.elements.lapsList;
    if (!lapsList) return;

    if (this.laps.length === 0) {
      lapsList.innerHTML = '';
      return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    this.laps.forEach((lap, index) => {
      const prevLapTime = index === 0 ? lap.time : lap.time - this.laps[index - 1].time;
      const li = document.createElement('li');
      li.className = 'lap-item';
      li.innerHTML = `
        <span class="lap-number">Lap ${lap.number}</span>
        <span class="lap-time">${this.formatLapTime(lap.time)}</span>
        <span class="lap-delta">+${this.formatLapTime(prevLapTime)}</span>
      `;
      fragment.appendChild(li);
    });

    lapsList.innerHTML = '';
    lapsList.appendChild(fragment);
  }

  /**
   * Cleanup method to clear interval when component is destroyed
   */
  destroy() {
    this.stop();
  }
}
