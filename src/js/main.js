// ==================== CARD POSITIONS CONFIG ====================
// Configure x positions for all popup cards (in pixels from center)
// Set to null or undefined to use default centered position
const cardPositions = {
  pomodoroCard: null,    // Centered (default)
  timerCard: 300,        // 300px to the right of center
  tasklistCard: -300,    // 300px to the left of center
  countdownCard: null,   // Centered (default)
  worldClockCard: 600,   // 600px to the right of center
};

// ==================== DRAG FUNCTIONALITY ====================
let activeCard = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('pointerdown', (e) => {
    activeCard = card;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = card.offsetLeft;
    initialTop = card.offsetTop;
    e.preventDefault();
    document.body.style.userSelect = 'none';
    if (e.pointerId && card.setPointerCapture) {
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    document.addEventListener('pointermove', pointerMove);
    document.addEventListener('pointerup', pointerUp);
  });
});

function pointerMove(e){
    if (!activeCard) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    activeCard.style.left = (initialLeft + dx) + 'px';
    activeCard.style.top = (initialTop + dy) + 'px';
}

function pointerUp(e){
    if (!activeCard) return;
    if (e.pointerId && activeCard.releasePointerCapture) {
      try { activeCard.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    activeCard = null;
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('pointerup', pointerUp);
    document.body.style.userSelect = '';
}

// Navbar toggle (mobile) — minimal, accessible
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.navbar-toggle');
  const menu = document.getElementById('navbar-menu') || document.querySelector('.navbar-menu');
  if (!toggle || !menu) return;

  toggle.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');

  const openMenu = () => {
    menu.classList.add('open');
    toggle.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    const firstLink = menu.querySelector('a'); if (firstLink) firstLink.focus();
  };

  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  toggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  document.addEventListener('click', (ev) => {
    if (!menu.contains(ev.target) && !toggle.contains(ev.target) && menu.classList.contains('open')) closeMenu();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && menu.classList.contains('open')) closeMenu();
  });
});

// Reusable toggle setup function (keeps button names fixed)
function setupToggle(buttonId, cardId) {
  const button = document.getElementById(buttonId);
  const card = document.getElementById(cardId);
  if (!button || !card) return;

  let isPressed = false;
  button.addEventListener('click', () => {
    isPressed = !isPressed;
    if (isPressed) {
      button.classList.add('pressed');
      card.classList.remove('hidden');
    } else {
      button.classList.remove('pressed');
      card.classList.add('hidden');
    }
  });

  // Close card when clicking the close button
  const closeBtn = card.querySelector('.card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPressed = false;
      button.classList.remove('pressed');
      card.classList.add('hidden');
    });
  }

  // Close card when clicking outside (but not on internal buttons)
  document.addEventListener('click', (e) => {
    if (isPressed && !card.contains(e.target) && !button.contains(e.target)) {
      // Check if clicked element is not inside the card
      const clickedInCard = card.querySelector('*:hover');
      if (!clickedInCard) {
        isPressed = false;
        button.classList.remove('pressed');
        card.classList.add('hidden');
      }
    }
  });
}

// ==================== POMODORO TIMER ====================
class PomodoroTimer {
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
    setTimeout(() => {
      const workInput = document.getElementById('pomodoroWork');
      const breakInput = document.getElementById('pomodoroBreak');
      const startBtn = document.getElementById('pomodoroStart');
      const stopBtn = document.getElementById('pomodoroStop');
      const resetBtn = document.getElementById('pomodoroReset');

      if (workInput) {
        workInput.addEventListener('change', (e) => {
          this.workTime = parseInt(e.target.value) || 25;
          if (!this.isRunning) this.reset();
        });
      }
      if (breakInput) {
        breakInput.addEventListener('change', (e) => {
          this.breakTime = parseInt(e.target.value) || 5;
        });
      }
      if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); this.start(); });
      if (stopBtn) stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stop(); });
      if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.reset(); });
    }, 100);
    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft < 0) {
        this.isBreak = !this.isBreak;
        this.timeLeft = (this.isBreak ? this.breakTime : this.workTime) * 60;
        alert(this.isBreak ? 'Break time!' : 'Work time!');
      }
      this.updateDisplay();
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
  }

  reset() {
    this.stop();
    this.timeLeft = this.workTime * 60;
    this.isBreak = false;
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
}

// ==================== SIMPLE TIMER ====================
class SimpleTimer {
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
    this.updateTotal();
  }

  updateTotal() {
    const mins = parseInt(document.getElementById('timerMinutes').value) || 0;
    const secs = parseInt(document.getElementById('timerSeconds').value) || 0;
    this.totalSeconds = mins * 60 + secs;
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
        alert('Timer finished!');
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
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// ==================== TASK LIST ====================
class TaskList {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    this.init();
    this.render();
  }

  init() {
    setTimeout(() => {
      const addBtn = document.getElementById('addTaskBtn');
      const input = document.getElementById('taskInput');

      if (addBtn) addBtn.addEventListener('click', (e) => { e.stopPropagation(); this.addTask(); });
      if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          this.addTask();
        }
      });
    }, 100);
  }

  addTask() {
    const input = document.getElementById('taskInput');
    const task = input.value.trim();
    if (!task) return;
    this.tasks.push({ text: task, done: false, id: Date.now() });
    input.value = '';
    this.save();
    this.render();
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
    this.render();
  }

  toggleTask(id) {
    this.tasks.find(t => t.id === id).done = !this.tasks.find(t => t.id === id).done;
    this.save();
    this.render();
  }

  save() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }

  render() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'done' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => taskListInstance.toggleTask(task.id));
      
      const span = document.createElement('span');
      span.textContent = task.text;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => taskListInstance.deleteTask(task.id));
      
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }
}

// ==================== COUNTDOWN ====================
class CountdownTimer {
  constructor() {
    this.targetDate = null;
    this.isRunning = false;
    this.interval = null;
    this.init();
  }

  init() {
    setTimeout(() => {
      const startBtn = document.getElementById('countdownStart');
      const stopBtn = document.getElementById('countdownStop');
      const dateInput = document.getElementById('countdownDate');

      if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); this.start(); });
      if (stopBtn) stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stop(); });
      if (dateInput) dateInput.addEventListener('change', () => this.updateDisplay());
    }, 100);
    this.updateDisplay();
  }

  start() {
    const dateInput = document.getElementById('countdownDate').value;
    if (!dateInput) {
      alert('Please select a date and time!');
      return;
    }
    this.targetDate = new Date(dateInput).getTime();
    if (this.targetDate <= Date.now()) {
      alert('Please select a future date!');
      return;
    }
    this.isRunning = true;
    this.interval = setInterval(() => this.updateDisplay(), 1000);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
  }

  updateDisplay() {
    if (!this.targetDate) {
      document.getElementById('countdownDisplay').textContent = '00:00:00:00';
      return;
    }
    const now = Date.now();
    let diff = this.targetDate - now;
    
    if (diff < 0) {
      this.stop();
      document.getElementById('countdownDisplay').textContent = '00:00:00:00';
      alert('Countdown finished!');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    document.getElementById('countdownDisplay').textContent = 
      `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// ==================== WORLD CLOCK ====================
class WorldClock {
  constructor() {
    this.timezones = JSON.parse(localStorage.getItem('worldClockTimezones')) || [];
    this.init();
    this.render();
  }

  init() {
    setTimeout(() => {
      const addBtn = document.getElementById('addTimezoneBtn');
      if (addBtn) addBtn.addEventListener('click', (e) => { e.stopPropagation(); this.addTimezone(); });
    }, 100);
    setInterval(() => this.render(), 1000);
  }

  addTimezone() {
    const select = document.getElementById('timezoneSelect');
    const tz = select.value;
    const tzName = select.options[select.selectedIndex].text;
    if (!this.timezones.find(t => t.tz === tz)) {
      this.timezones.push({ tz, name: tzName });
      this.save();
      this.render();
    }
  }

  removeTimezone(tz) {
    this.timezones = this.timezones.filter(t => t.tz !== tz);
    this.save();
    this.render();
  }

  save() {
    localStorage.setItem('worldClockTimezones', JSON.stringify(this.timezones));
  }

  render() {
    const list = document.getElementById('timezoneList');
    list.innerHTML = this.timezones.map(({ tz, name }) => {
      const time = new Date().toLocaleString('en-US', { timeZone: tz });
      return `
        <div class="timezone-item">
          <span class="tz-name">${name}</span>
          <span class="tz-time">${time}</span>
          <button class="delete-btn" onclick="worldClockInstance.removeTimezone('${tz}')">×</button>
        </div>
      `;
    }).join('');
  }
}

// Initialize all features
document.addEventListener('DOMContentLoaded', async () => {
  // Import and initialize theme toggle
  await import('./theme-toggle.js');
  
  // Initialize card positions
  Object.entries(cardPositions).forEach(([cardId, xOffset]) => {
    const card = document.getElementById(cardId);
    if (card && xOffset !== null && xOffset !== undefined) {
      // Calculate left position: 50% + xOffset pixels
      card.style.left = `calc(50% + ${xOffset}px)`;
    }
  });

  const pomodoroTimer = new PomodoroTimer();
  const simpleTimer = new SimpleTimer();
  const taskListInstance = window.taskListInstance = new TaskList();
  const countdownTimer = new CountdownTimer();
  const worldClockInstance = window.worldClockInstance = new WorldClock();

  setupToggle('pomodoroButton', 'pomodoroCard');
  setupToggle('timerButton', 'timerCard');
  setupToggle('tasklistButton', 'tasklistCard');
  setupToggle('countdownButton', 'countdownCard');
  setupToggle('worldClockButton', 'worldClockCard');
});
