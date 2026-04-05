const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const Countdown = require('../models/Countdown');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const doc = await Countdown.findOne({ userId }).lean();
    if (!doc) return res.json(null);
    return res.json({
      _id: doc._id,
      label: doc.label,
      targetDate: doc.targetDate,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('countdown GET:', err);
    return res.status(500).json({ message: 'Erro ao carregar countdown' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const targetDate = req.body?.targetDate ? new Date(req.body.targetDate) : null;
    const label = String(req.body?.label || 'Countdown').trim();
    if (!targetDate || Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'targetDate inválido' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const doc = await Countdown.findOneAndUpdate(
      { userId },
      { $set: { targetDate, label } },
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(201).json({
      _id: doc._id,
      label: doc.label,
      targetDate: doc.targetDate,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('countdown POST:', err);
    return res.status(500).json({ message: 'Erro ao guardar countdown' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    await Countdown.deleteOne({ userId });
    return res.json({ ok: true });
  } catch (err) {
    console.error('countdown DELETE:', err);
    return res.status(500).json({ message: 'Erro ao remover countdown' });
  }
});

module.exports = router;
