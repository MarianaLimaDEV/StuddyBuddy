const express = require('express');
const Timezone = require('../models/Timezone');
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

// GET /api/worldclock - lista todos os fusos horários guardados do utilizador
router.get('/', requireAuth, getUserId, async (req, res) => {
  try {
    const query = req.userId ? { userId: req.userId } : { userId: null };
    const timezones = await Timezone.find(query).sort({ createdAt: 1 });
    res.json(timezones);
  } catch (err) {
    console.error('Erro ao obter fusos horários:', err);
    res.status(500).json({ message: 'Erro ao obter fusos horários' });
  }
});

// POST /api/worldclock - adiciona um novo fuso horário
router.post('/', requireAuth, getUserId, async (req, res) => {
  try {
    const { tz, name } = req.body;

    if (!tz || !name) {
      return res.status(400).json({ message: 'tz e name são obrigatórios' });
    }

    // Verifica duplicados para o mesmo utilizador
    const query = req.userId ? { userId: req.userId, tz } : { userId: null, tz };
    const existing = await Timezone.findOne(query);
    if (existing) {
      return res.status(409).json({ message: 'Este fuso horário já existe' });
    }

    const timezone = await Timezone.create({ userId: req.userId, tz, name });
    res.status(201).json(timezone);
  } catch (err) {
    console.error('Erro ao criar fuso horário:', err);
    res.status(500).json({ message: 'Erro ao criar fuso horário' });
  }
});

// DELETE /api/worldclock/:tz - remove um fuso horário pelo identificador tz
router.delete('/:tz', requireAuth, getUserId, async (req, res) => {
  try {
    const { tz } = req.params;
    const query = req.userId ? { userId: req.userId, tz } : { userId: null, tz };
    const timezone = await Timezone.findOneAndDelete(query);

    if (!timezone) {
      return res.status(404).json({ message: 'Fuso horário não encontrado' });
    }

    res.json({ message: 'Fuso horário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover fuso horário:', err);
    res.status(500).json({ message: 'Erro ao remover fuso horário' });
  }
});

module.exports = router;

