const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const Timezone = require('../models/Timezone');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const rows = await Timezone.find({ userId }).sort({ createdAt: 1 }).lean();
    const payload = rows.map((r) => ({
      _id: r._id,
      tz: r.tz,
      name: r.name,
    }));
    return res.json(payload);
  } catch (err) {
    console.error('worldclock GET:', err);
    return res.status(500).json({ message: 'Erro ao carregar fusos horários' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const tz = String(req.body?.tz || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!tz || !name) {
      return res.status(400).json({ message: 'tz e name são obrigatórios' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const doc = await Timezone.findOneAndUpdate(
      { userId, tz },
      { $set: { name } },
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(201).json({
      _id: doc._id,
      tz: doc.tz,
      name: doc.name,
    });
  } catch (err) {
    console.error('worldclock POST:', err);
    return res.status(500).json({ message: 'Erro ao guardar fuso horário' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    const tz = String(req.query?.tz || '').trim();
    if (!tz) return res.status(400).json({ message: 'tz é obrigatório' });
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    await Timezone.deleteOne({ userId, tz });
    return res.json({ ok: true });
  } catch (err) {
    console.error('worldclock DELETE:', err);
    return res.status(500).json({ message: 'Erro ao remover fuso horário' });
  }
});

module.exports = router;
