const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('email settings');
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });
    return res.json({ email: user.email, settings: user.settings });
  } catch (err) {
    console.error('Erro ao obter utilizador:', err);
    return res.status(500).json({ message: 'Erro ao obter utilizador' });
  }
});

// GET /api/user/settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('settings');
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });
    return res.json(user.settings);
  } catch (err) {
    console.error('Erro ao obter settings:', err);
    return res.status(500).json({ message: 'Erro ao obter settings' });
  }
});

// PUT /api/user/settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { theme, soundMuted } = req.body || {};

    const update = {};
    if (typeof theme !== 'undefined') {
      if (theme !== 'dark' && theme !== 'light') {
        return res.status(400).json({ message: 'Theme inválido' });
      }
      update['settings.theme'] = theme;
    }

    if (typeof soundMuted !== 'undefined') {
      update['settings.soundMuted'] = Boolean(soundMuted);
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'Nada para atualizar' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { $set: update },
      { new: true, runValidators: true, select: 'settings' }
    );

    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });
    return res.json(user.settings);
  } catch (err) {
    console.error('Erro ao atualizar settings:', err);
    return res.status(500).json({ message: 'Erro ao atualizar settings' });
  }
});

module.exports = router;

