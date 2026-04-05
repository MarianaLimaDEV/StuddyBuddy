const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET não definido');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');
    if (!email) return res.status(400).json({ message: 'Email é obrigatório' });
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password deve ter pelo menos 8 caracteres' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Este email já está registado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { email: user.email },
    });
  } catch (err) {
    if (err.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: err.message });
    }
    console.error('register error:', err);
    return res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password são obrigatórios' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = signToken(user);
    return res.json({
      token,
      user: { email: user.email },
    });
  } catch (err) {
    if (err.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: err.message });
    }
    console.error('login error:', err);
    return res.status(500).json({ message: 'Erro ao iniciar sessão' });
  }
});

router.post('/google', (req, res) => {
  res.status(501).json({
    message: 'Login Google não configurado neste servidor. Usa email/password ou configura GOOGLE_CLIENT_ID no backend.',
  });
});

router.post('/forgot-password', (req, res) => {
  res.status(501).json({ message: 'Recuperação de password não configurada neste servidor.' });
});

router.post('/reset-password', (req, res) => {
  res.status(501).json({ message: 'Reset de password não configurado neste servidor.' });
});

module.exports = router;
