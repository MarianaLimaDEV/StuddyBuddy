/**
 * Task List Module
 * Manages a todo list with local storage persistence
 */
export class TaskList {
  constructor() {
    this.tasks = [];
    this.init();
  }

  init() {
    // Load tasks from localStorage with error handling
    try {
      const storedTasks = localStorage.getItem('tasks');
      this.tasks = storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.warn('Failed to load tasks from localStorage:', error);
      this.tasks = [];
    }

    // Setup event listeners with proper error handling
    setTimeout(() => {
      const addBtn = document.getElementById('addTaskBtn');
      const input = document.getElementById('taskInput');

      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.addTask();
        });
      }

      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            this.addTask();
          }
        });
      }
    }, 100);

    this.render();
  }

  addTask() {
    const input = document.getElementById('taskInput');
    const taskText = input.value.trim();

    // Validate input
    if (!taskText) {
      this.showFeedback('Por favor, insira uma tarefa', 'warning');
      return;
    }

    if (taskText.length > 200) {
      this.showFeedback('A tarefa não pode ter mais de 200 caracteres', 'warning');
      return;
    }

    // Check for duplicate tasks
    const isDuplicate = this.tasks.some(t => t.text.toLowerCase() === taskText.toLowerCase());
    if (isDuplicate) {
      this.showFeedback('Esta tarefa já existe', 'warning');
      return;
    }

    // Add new task
    this.tasks.push({
      text: taskText,
      done: false,
      id: Date.now(),
      createdAt: new Date().toISOString()
    });

    input.value = '';
    this.save();
    this.render();
    this.showFeedback('Tarefa adicionada com sucesso!', 'success');
  }

  deleteTask(id) {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    this.tasks.splice(taskIndex, 1);
    this.save();
    this.render();
    this.showFeedback('Tarefa eliminada', 'success');
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : null;
      this.save();
      this.render();
    }
  }

  save() {
    try {
      localStorage.setItem('tasks', JSON.stringify(this.tasks));
    } catch (error) {
      console.warn('Failed to save tasks to localStorage:', error);
      this.showFeedback('Falha ao guardar tarefas. O armazenamento pode estar cheio.', 'error');
    }
  }

  /**
   * Show user feedback notification
   * @param {string} message - Message to display
   * @param {string} type - Notification type: 'success', 'warning', 'error'
   */
  showFeedback(message, type = 'success') {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = `feedback feedback-${type}`;
    feedback.setAttribute('role', 'alert');
    feedback.setAttribute('aria-live', 'polite');
    feedback.textContent = message;

    // Style based on type
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

    // Animate in
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => feedback.remove(), 300);
    }, 3000);
  }

  render() {
    const list = document.getElementById('taskList');
    if (!list) return;

    list.innerHTML = '';

    if (this.tasks.length === 0) {
      list.innerHTML = '<li class="empty-message">Nenhuma tarefa ainda. Adicione uma acima!</li>';
      return;
    }

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'done' : ''}`;
      li.setAttribute('role', 'listitem');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', `Marcar tarefa "${task.text}" como ${task.done ? 'não concluída' : 'concluída'}`);
      checkbox.addEventListener('change', () => this.toggleTask(task.id));

      const span = document.createElement('span');
      span.textContent = task.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', `Eliminar tarefa "${task.text}"`);
      deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }
}

