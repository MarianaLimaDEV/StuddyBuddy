/**
 * Task List Module
 * Offline-first: MongoDB + IndexedDB + fila de sincronização (Background Sync).
 */
import { showNotification } from './utils.js';
import { playSound } from './sound.js';
import {
  carregarTasks,
  salvarOffline,
  removerOffline,
  addToPendingSync,
} from './db.js';
import { registerBackgroundSync } from './pwa/sync.js';
import { apiFetch, apiUrl } from './api-base.js';

const TASKS_API_URL = apiUrl('/api/tasks');

export class TaskList {
  constructor() {
    this.tasks = [];
    this.inFlight = new Set(); // Track in-flight toggle requests
    this.init();
  }

  init() {
    // Setup event listeners com tratamento de erros
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

    this.loadTasksFromApi();
    window.addEventListener('pwa-synced', () => this.loadTasksFromApi());
  }

  async loadTasksFromApi() {
    try {
      const data = await carregarTasks();
      this.tasks = (data || []).map((t) => ({
        id: t._id,
        text: t.text,
        done: Boolean(t.done),
        createdAt: t.createdAt,
        completedAt: t.completedAt ?? null,
      }));
      this.render();
    } catch (error) {
      console.warn('Falha ao carregar tarefas (API + offline):', error);
      this.tasks = [];
      this.render();
      showNotification('Não foi possível carregar as tarefas', 'warning');
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
      const response = await apiFetch(TASKS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: taskText }),
      });

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

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
      // Check if truly network-related (not a server validation error)
      const isNetworkError = !navigator.onLine || error.message.includes('Failed to fetch') || error.message.includes('NetworkError');
      
      if (!isNetworkError) {
        // Server validation error - show error, don't save locally
        showNotification('Erro ao adicionar tarefa: ' + error.message, 'error');
        return;
      }

      // Offline: add to UI immediately, then try to queue for sync
      const tempId = `temp-${Date.now()}`;
      const tempTask = {
        _id: tempId,
        text: taskText,
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      
      // Add to UI immediately for consistency
      this.tasks.push({
        id: tempId,
        text: tempTask.text,
        done: false,
        createdAt: tempTask.createdAt,
        completedAt: null,
      });
      input.value = '';
      this.render();

      // Try to queue for sync (best-effort)
      try {
        await addToPendingSync({
          type: 'POST',
          url: TASKS_API_URL,
          body: { text: taskText },
        });
        await salvarOffline('tasks', tempTask);
        await registerBackgroundSync();
      } catch (syncError) {
        console.error('Failed to queue offline task:', syncError);
        // UI already updated, just show notification about local save
      }
      
      playSound('task_add');
      showNotification('Tarefa guardada localmente; será sincronizada quando houver ligação.', 'info');
    }
  }

async deleteTask(id) {
    // Save previous state for revert on error
    const previousTasks = [...this.tasks];

    // Optimistic UI update
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.render();

    try {
      const response = await apiFetch(`${TASKS_API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      playSound('task_delete');
    } catch (error) {
      try {
        await addToPendingSync({ type: 'DELETE', url: `${TASKS_API_URL}/${id}`, id });
        await removerOffline('tasks', id);
        await registerBackgroundSync();
      } catch (syncError) {
        console.error('Failed to queue offline delete:', syncError);
        // Revert UI on sync queue failure
        this.tasks = previousTasks;
        this.render();
      }
      playSound('task_delete');
      showNotification('Eliminação será sincronizada quando houver ligação.', 'info');
    }
  }

async toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    if (this.inFlight.has(id)) return;

    // Optimistic UI update
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
    this.render();

    // Mark as in-flight
    this.inFlight.add(id);

    try {
      const response = await apiFetch(`${TASKS_API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: task.done }),
      });
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const updated = await response.json();
      task.done = Boolean(updated.done);
      task.completedAt = updated.completedAt ?? null;
      playSound('task_toggle');
    } catch (error) {
      await addToPendingSync({
        type: 'PUT',
        url: `${TASKS_API_URL}/${id}`,
        body: { done: task.done },
      });
      await salvarOffline('tasks', {
        _id: id,
        text: task.text,
        done: task.done,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      });
      await registerBackgroundSync();
      playSound('task_toggle');
      showNotification('Alteração guardada localmente; será sincronizada quando houver ligação.', 'info');
    } finally {
      // Clear in-flight marker and re-render
      this.inFlight.delete(id);
      this.render();
    }
  }

  render() {
    const list = document.getElementById('taskList');
    if (!list) return;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    if (!this.tasks.length) {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'Nenhuma tarefa ainda. Adicione uma acima!';
      fragment.appendChild(emptyMsg);
    } else {
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
        fragment.appendChild(li);
      });
    }

    list.innerHTML = '';
    list.appendChild(fragment);
  }
}

