const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(user, { rememberMe = false } = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET não definido no servidor. Define JWT_SECRET no ficheiro .env.');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }

  const expiresIn = rememberMe
    ? process.env.JWT_EXPIRES_IN_REMEMBER || '30d'
    : process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    secret,
    { expiresIn }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password deve ter pelo menos 8 caracteres' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Este email já está registado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      settings: { theme: 'dark', soundMuted: false },
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { email: user.email, settings: user.settings },
    });
  } catch (err) {
    console.error('Erro ao registar utilizador:', err);
    if (err?.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: err.message });
    }
    // Duplicate key (race condition) fallback
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Este email já está registado' });
    }
    return res.status(500).json({ message: 'Erro ao registar utilizador' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password é obrigatória' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = signToken(user, { rememberMe: Boolean(rememberMe) });
    return res.json({
      token,
      user: { email: user.email, settings: user.settings },
    });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    if (err?.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

module.exports = router;

