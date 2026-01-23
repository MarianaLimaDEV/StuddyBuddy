const express = require('express');
const Timezone = require('../models/Timezone');

const router = express.Router();

// GET /api/worldclock - lista todos os fusos horários guardados
router.get('/', async (req, res) => {
  try {
    const timezones = await Timezone.find().sort({ createdAt: 1 });
    res.json(timezones);
  } catch (err) {
    console.error('Erro ao obter fusos horários:', err);
    res.status(500).json({ message: 'Erro ao obter fusos horários' });
  }
});

// POST /api/worldclock - adiciona um novo fuso horário
router.post('/', async (req, res) => {
  try {
    const { tz, name } = req.body;

    if (!tz || !name) {
      return res.status(400).json({ message: 'tz e name são obrigatórios' });
    }

    // Verifica duplicados
    const existing = await Timezone.findOne({ tz });
    if (existing) {
      return res.status(409).json({ message: 'Este fuso horário já existe' });
    }

    const timezone = await Timezone.create({ tz, name });
    res.status(201).json(timezone);
  } catch (err) {
    console.error('Erro ao criar fuso horário:', err);
    res.status(500).json({ message: 'Erro ao criar fuso horário' });
  }
});

// DELETE /api/worldclock/:tz - remove um fuso horário pelo identificador tz
router.delete('/:tz', async (req, res) => {
  try {
    const { tz } = req.params;
    const timezone = await Timezone.findOneAndDelete({ tz });

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

