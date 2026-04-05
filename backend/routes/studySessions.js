const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const StudySession = require('../models/StudySession');

const router = express.Router();

/**
 * GET — list sessions for logged-in user (for stats sync across devices).
 * Returns flat rows: { date, minutes, type } for aggregation on the client.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const rows = await StudySession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(2500)
      .lean();

    const payload = rows.map((r) => ({
      date: r.date,
      minutes: r.minutes,
      type: r.type || 'pomodoro',
    }));
    return res.json(payload);
  } catch (err) {
    console.error('study-sessions GET:', err);
    return res.status(500).json({ message: 'Erro ao carregar sessões de estudo' });
  }
});

/**
 * POST — record one session (e.g. completed Pomodoro work segment).
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const minutes = Number(req.body?.minutes);
    const date = String(req.body?.date || '').slice(0, 10);
    const type = ['pomodoro', 'focus', 'manual'].includes(req.body?.type)
      ? req.body.type
      : 'pomodoro';

    if (!Number.isFinite(minutes) || minutes < 1) {
      return res.status(400).json({ message: 'minutes inválido' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date deve ser YYYY-MM-DD' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const doc = await StudySession.create({ userId, minutes, date, type });
    return res.status(201).json({
      _id: doc._id,
      date: doc.date,
      minutes: doc.minutes,
      type: doc.type,
    });
  } catch (err) {
    console.error('study-sessions POST:', err);
    return res.status(500).json({ message: 'Erro ao guardar sessão' });
  }
});

module.exports = router;
