const express = require('express');
const Countdown = require('../models/Countdown');

const router = express.Router();

// GET /api/countdown - devolve o countdown atual (se existir)
router.get('/', async (req, res) => {
  try {
    const countdown = await Countdown.findOne().sort({ updatedAt: -1 });
    res.json(countdown || null);
  } catch (err) {
    console.error('Erro ao obter countdown:', err);
    res.status(500).json({ message: 'Erro ao obter countdown' });
  }
});

// POST /api/countdown - define/atualiza a data alvo
router.post('/', async (req, res) => {
  try {
    const { targetDate } = req.body;

    if (!targetDate) {
      return res.status(400).json({ message: 'targetDate é obrigatório' });
    }

    const date = new Date(targetDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'targetDate inválido' });
    }

    let countdown = await Countdown.findOne();
    if (!countdown) {
      countdown = await Countdown.create({ targetDate: date });
    } else {
      countdown.targetDate = date;
      await countdown.save();
    }

    res.status(201).json(countdown);
  } catch (err) {
    console.error('Erro ao definir countdown:', err);
    res.status(500).json({ message: 'Erro ao definir countdown' });
  }
});

module.exports = router;

