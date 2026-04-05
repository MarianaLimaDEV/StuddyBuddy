const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET não definido no servidor' });
  }

  try {
    const payload = jwt.verify(token, secret);
    const userId = payload.userId || payload.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    req.user = { userId: String(userId), email: payload.email || '' };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

module.exports = { requireAuth };
