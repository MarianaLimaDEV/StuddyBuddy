const express = require('express');
const Countdown = require('../models/Countdown');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware to get userId from auth (handles both authenticated and anonymous)
function getUserId(req, res, next) {
  if (req.user && req.user.userId) {
    req.userId = req.user.userId;
  } else {
    // For anonymous users, use a special ID or null
    req.userId = null;
  }
  next();
}

// GET /api/countdown - devolve o countdown atual do utilizador (se existir)
router.get('/', requireAuth, getUserId, async (req, res) => {
  try {
    const query = req.userId ? { userId: req.userId } : { userId: null };
    const countdown = await Countdown.findOne(query).sort({ updatedAt: -1 });
    res.json(countdown || null);
  } catch (err) {
    console.error('Erro ao obter countdown:', err);
    res.status(500).json({ message: 'Erro ao obter countdown' });
  }
});

// POST /api/countdown - define/atualiza a data alvo
router.post('/', requireAuth, getUserId, async (req, res) => {
  try {
    const { targetDate, label } = req.body;

    if (!targetDate) {
      return res.status(400).json({ message: 'targetDate é obrigatório' });
    }

    const date = new Date(targetDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'targetDate inválido' });
    }

    const query = req.userId ? { userId: req.userId } : { userId: null };
    let countdown = await Countdown.findOne(query);
    
    if (!countdown) {
      countdown = await Countdown.create({ 
        userId: req.userId, 
        targetDate: date,
        label: label || 'Countdown'
      });
    } else {
      countdown.targetDate = date;
      if (label) countdown.label = label;
      await countdown.save();
    }

    res.status(201).json(countdown);
  } catch (err) {
    console.error('Erro ao definir countdown:', err);
    res.status(500).json({ message: 'Erro ao definir countdown' });
  }
});

// DELETE /api/countdown - remove o countdown do utilizador
router.delete('/', requireAuth, getUserId, async (req, res) => {
  try {
    const query = req.userId ? { userId: req.userId } : { userId: null };
    const countdown = await Countdown.findOneAndDelete(query);

    if (!countdown) {
      return res.status(404).json({ message: 'Countdown não encontrado' });
    }

    res.json({ message: 'Countdown removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover countdown:', err);
    res.status(500).json({ message: 'Erro ao remover countdown' });
  }
});

module.exports = router;

