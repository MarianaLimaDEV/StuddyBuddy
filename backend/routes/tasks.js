const express = require('express');
const Task = require('../models/Task');

const router = express.Router();

// GET /api/tasks - lista todas as tarefas
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    console.error('Erro ao obter tarefas:', err);
    res.status(500).json({ message: 'Erro ao obter tarefas' });
  }
});

// POST /api/tasks - cria uma nova tarefa
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'O texto da tarefa é obrigatório' });
    }

    const task = await Task.create({ text: text.trim() });
    res.status(201).json(task);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ message: 'Erro ao criar tarefa' });
  }
});

// PUT /api/tasks/:id - atualiza o estado done de uma tarefa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { done } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    task.done = Boolean(done);
    task.completedAt = task.done ? new Date() : null;
    await task.save();

    res.json(task);
  } catch (err) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ message: 'Erro ao atualizar tarefa' });
  }
});

// DELETE /api/tasks/:id - remove uma tarefa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    res.json({ message: 'Tarefa eliminada com sucesso' });
  } catch (err) {
    console.error('Erro ao eliminar tarefa:', err);
    res.status(500).json({ message: 'Erro ao eliminar tarefa' });
  }
});

module.exports = router;

