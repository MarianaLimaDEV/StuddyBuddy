const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');

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

// POST /api/auth/forgot-password
// Security: do NOT reveal whether an email exists.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('_id email');

    // Always return 200 with a generic message (anti-enumeration)
    const generic = { message: 'Se o email existir, enviámos instruções para redefinir a password.' };

    if (!user) return res.json(generic);

    // Create random token (raw) + store only hash
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = Number(process.env.RESET_PASSWORD_TTL_MINUTES || 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      requestedIp: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    // In production you should send an email with a reset link.
    // For TCC/dev: return token only in non-production to allow testing.
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...generic, dev: { token: rawToken, expiresInMinutes: ttlMinutes } });
    }
    return res.json(generic);
  } catch (err) {
    console.error('Erro no forgot-password:', err);
    return res.status(500).json({ message: 'Erro ao iniciar redefinição de password' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token é obrigatório' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password deve ter pelo menos 8 caracteres' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    record.usedAt = new Date();
    await record.save();

    // Invalidate other pending reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

    return res.json({ message: 'Password atualizada com sucesso. Já podes fazer login.' });
  } catch (err) {
    console.error('Erro no reset-password:', err);
    return res.status(500).json({ message: 'Erro ao redefinir password' });
  }
});

module.exports = router;

