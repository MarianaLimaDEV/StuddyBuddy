const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });
    const s = user.settings || {};
    return res.json({
      theme: s.theme === 'light' ? 'light' : 'dark',
      soundMuted: Boolean(s.soundMuted),
    });
  } catch (err) {
    console.error('GET settings:', err);
    return res.status(500).json({ message: 'Erro ao carregar definições' });
  }
});

router.put('/settings', requireAuth, async (req, res) => {
  try {
    const partial = req.body || {};
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    if (!user.settings) user.settings = {};
    if (partial.theme === 'dark' || partial.theme === 'light') user.settings.theme = partial.theme;
    if (typeof partial.soundMuted === 'boolean') user.settings.soundMuted = partial.soundMuted;
    if (typeof user.settings.theme === 'undefined') user.settings.theme = 'dark';
    if (typeof user.settings.soundMuted === 'undefined') user.settings.soundMuted = false;

    await user.save();
    return res.json(user.settings);
  } catch (err) {
    console.error('PUT settings:', err);
    return res.status(500).json({ message: 'Erro ao guardar definições' });
  }
});

module.exports = router;
