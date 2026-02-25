const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { hasSmtpConfig, sendEmail } = require('../mailer');

const router = express.Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

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

function getPublicBaseUrl(req) {
  const envBase = process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return String(envBase).replace(/\/+$/, '');

  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function buildVerifyEmailLink(req, rawToken) {
  const base = getPublicBaseUrl(req);
  const url = new URL('/api/auth/verify-email', base);
  url.searchParams.set('token', rawToken);
  return url.toString();
}

async function sendVerificationEmail({ req, to, rawToken }) {
  const link = buildVerifyEmailLink(req, rawToken);
  const subject = 'Verifica o teu email — StuddyBuddy';
  const text = `Olá!\n\nPara verificar o teu email no StuddyBuddy, abre este link:\n${link}\n\nSe não foste tu, ignora este email.\n`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
      <h2>Verificação de email</h2>
      <p>Para verificar o teu email no <strong>StuddyBuddy</strong>, clica aqui:</p>
      <p><a href="${link}">Verificar email</a></p>
      <p style="color:#666;">Se não foste tu, podes ignorar este email.</p>
    </div>
  `;

  if (process.env.NODE_ENV !== 'production' && !hasSmtpConfig()) {
    // Dev convenience: no SMTP configured, skip sending
    return { skipped: true, link };
  }

  await sendEmail({ to, subject, text, html });
  return { skipped: false, link };
}

async function createEmailVerificationToken({ userId, req }) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const ttlMinutes = Number(process.env.EMAIL_VERIFY_TTL_MINUTES || 60 * 24); // 24h default
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // Invalidate previous unused tokens
  await EmailVerificationToken.deleteMany({ userId, usedAt: null });

  await EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
    requestedIp: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

  return { rawToken, ttlMinutes };
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

    // Create verification token + send email (best-effort in dev)
    const { rawToken, ttlMinutes } = await createEmailVerificationToken({ userId: user._id, req });
    const mailResult = await sendVerificationEmail({ req, to: user.email, rawToken });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { email: user.email, settings: user.settings, emailVerified: Boolean(user.emailVerified) },
      ...(process.env.NODE_ENV !== 'production'
        ? { dev: { verifyLink: mailResult.link, token: rawToken, expiresInMinutes: ttlMinutes, emailSent: !mailResult.skipped } }
        : {}),
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

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query?.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token é obrigatório' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await EmailVerificationToken.findOne({
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

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    record.usedAt = new Date();
    await record.save();
    await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });

    const redirect = process.env.EMAIL_VERIFY_REDIRECT_URL;
    if (redirect) {
      const url = new URL(redirect);
      url.searchParams.set('verified', '1');
      return res.redirect(302, url.toString());
    }

    return res.json({ ok: true, message: 'Email verificado com sucesso.' });
  } catch (err) {
    console.error('Erro ao verificar email:', err);
    return res.status(500).json({ message: 'Erro ao verificar email' });
  }
});

// POST /api/auth/resend-verification
// Security: do NOT reveal whether an email exists.
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('_id email emailVerified');

    const generic = { message: 'Se o email existir, enviámos um link de verificação.' };
    if (!user) return res.json(generic);
    if (user.emailVerified) return res.json(generic);

    const { rawToken, ttlMinutes } = await createEmailVerificationToken({ userId: user._id, req });
    const mailResult = await sendVerificationEmail({ req, to: user.email, rawToken });

    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...generic, dev: { verifyLink: mailResult.link, token: rawToken, expiresInMinutes: ttlMinutes, emailSent: !mailResult.skipped } });
    }
    return res.json(generic);
  } catch (err) {
    console.error('Erro no resend-verification:', err);
    return res.status(500).json({ message: 'Erro ao reenviar verificação' });
  }
});

// POST /api/auth/google
// Body: { credential: <Google ID token> }
router.post('/google', async (req, res) => {
  try {
    const { credential, rememberMe } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Credential é obrigatório' });
    }
    if (!googleClient) {
      return res.status(500).json({ message: 'GOOGLE_CLIENT_ID não definido no servidor.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload() || {};
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email não encontrado no token Google.' });

    const emailVerified = Boolean(payload.email_verified);

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        emailVerified: emailVerified ? true : false,
        emailVerifiedAt: emailVerified ? new Date() : null,
        settings: { theme: 'dark', soundMuted: false },
      });
    } else if (emailVerified && !user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    const token = signToken(user, { rememberMe: Boolean(rememberMe) });
    return res.json({
      token,
      user: { email: user.email, settings: user.settings, emailVerified: Boolean(user.emailVerified) },
    });
  } catch (err) {
    console.error('Erro no login Google:', err);
    return res.status(500).json({ message: 'Erro ao autenticar com Google' });
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
    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Conta criada via Google. Use "Conectar com Google".' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.emailVerified) {
      return res.status(403).json({ message: 'Email ainda não verificado. Verifica o teu email antes de fazer login.' });
    }

    const token = signToken(user, { rememberMe: Boolean(rememberMe) });
    return res.json({
      token,
      user: { email: user.email, settings: user.settings, emailVerified: Boolean(user.emailVerified) },
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

