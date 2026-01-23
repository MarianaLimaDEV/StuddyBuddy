/**
 * Task List Module
 * Agora guarda as tarefas no backend (MongoDB) via API /api/tasks
 */
import { showNotification } from './utils.js';
import { playSound } from './sound.js';

const TASKS_API_URL = '/api/tasks';

export class TaskList {
  constructor() {
    this.tasks = [];
    this.inFlight = new Set(); // Track in-flight toggle requests
    this.init();
  }

  init() {
    // Setup event listeners com tratamento de erros
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

    // Carrega tarefas iniciais do backend
    this.loadTasksFromApi();
  }

  async loadTasksFromApi() {
    try {
      const response = await fetch(TASKS_API_URL);
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }
      const data = await response.json();
      // Normaliza id (_id vem do Mongo)
      this.tasks = (data || []).map((t) => ({
        id: t._id,
        text: t.text,
        done: Boolean(t.done),
        createdAt: t.createdAt,
        completedAt: t.completedAt ?? null,
      }));
      this.render();
    } catch (error) {
      console.warn('Falha ao carregar tarefas da API, lista começará vazia:', error);
      this.tasks = [];
      this.render();
      showNotification('Não foi possível carregar as tarefas do servidor', 'warning');
    }
  }

  async addTask() {
    const input = document.getElementById('taskInput');
    if (!input) return;

    const taskText = input.value.trim();

    // Validação
    if (!taskText) {
      showNotification('Por favor, insira uma tarefa', 'warning');
      return;
    }

    if (taskText.length > 200) {
      showNotification('A tarefa não pode ter mais de 200 caracteres', 'warning');
      return;
    }

    // Verificar duplicados localmente (UX mais rápida)
    const isDuplicate = this.tasks.some(
      (t) => t.text.toLowerCase() === taskText.toLowerCase()
    );
    if (isDuplicate) {
      showNotification('Esta tarefa já existe', 'warning');
      return;
    }

    try {
      const response = await fetch(TASKS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: taskText }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const created = await response.json();
      const newTask = {
        id: created._id,
        text: created.text,
        done: Boolean(created.done),
        createdAt: created.createdAt,
        completedAt: created.completedAt ?? null,
      };

      this.tasks.push(newTask);
      input.value = '';
      this.render();
      playSound('task_add');
    } catch (error) {
      console.error('Erro ao criar tarefa na API:', error);
      showNotification('Não foi possível criar a tarefa no servidor', 'error');
    }
  }

async deleteTask(id) {
    // Save previous state for revert on error
    const previousTasks = [...this.tasks];

    // Optimistic UI update
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.render();

    try {
      const response = await fetch(`${TASKS_API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      // Play sound only after API confirms success
      playSound('task_delete');
    } catch (error) {
      console.error('Erro ao eliminar tarefa na API:', error);
      // Revert in case of error
      this.tasks = previousTasks;
      this.render();
      showNotification('Não foi possível eliminar a tarefa no servidor', 'error');
    }
  }

async toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    // Check if a request is already in-flight for this task
    if (this.inFlight.has(id)) {
      return; // Ignore rapid toggle attempts
    }

    const previousDone = task.done;
    const previousCompletedAt = task.completedAt;

    // Optimistic UI update
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
    this.render();

    // Mark as in-flight
    this.inFlight.add(id);

    try {
      const response = await fetch(`${TASKS_API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ done: task.done }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const updated = await response.json();
      task.done = Boolean(updated.done);
      task.completedAt = updated.completedAt ?? null;
      playSound('task_toggle');
    } catch (error) {
      console.error('Erro ao atualizar tarefa na API:', error);
      // Revert in case of error
      task.done = previousDone;
      task.completedAt = previousCompletedAt;
      showNotification('Não foi possível atualizar a tarefa no servidor', 'error');
    } finally {
      // Clear in-flight marker and re-render
      this.inFlight.delete(id);
      this.render();
    }
  }

  render() {
    const list = document.getElementById('taskList');
    if (!list) return;

    list.innerHTML = '';

    if (!this.tasks.length) {
      list.innerHTML =
        '<li class="empty-message">Nenhuma tarefa ainda. Adicione uma acima!</li>';
      return;
    }

    this.tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'done' : ''}`;
      li.setAttribute('role', 'listitem');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute(
        'aria-label',
        `Marcar tarefa "${task.text}" como ${task.done ? 'não concluída' : 'concluída'}`
      );
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

