const express = require('express');
const Task = require('../models/Task');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: 1 }).lean();
    return res.json(tasks);
  } catch (err) {
    console.error('tasks GET:', err);
    return res.status(500).json({ message: 'Erro ao listar tarefas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ message: 'O texto da tarefa é obrigatório' });
    const task = await Task.create({ text });
    return res.status(201).json(task);
  } catch (err) {
    console.error('tasks POST:', err);
    return res.status(500).json({ message: 'Erro ao criar tarefa' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { done } = req.body;
    if (typeof done === 'undefined') {
      return res.status(400).json({ message: 'O campo done é obrigatório' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
    task.done = Boolean(done);
    task.completedAt = task.done ? new Date() : null;
    await task.save();
    return res.json(task);
  } catch (err) {
    console.error('tasks PUT:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'ID de tarefa inválido' });
    }
    return res.status(500).json({ message: 'Erro ao atualizar tarefa' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('tasks DELETE:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'ID de tarefa inválido' });
    }
    return res.status(500).json({ message: 'Erro ao eliminar tarefa' });
  }
});

module.exports = router;
