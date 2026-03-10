/**
 * StuddyBuddy API server.
 * Configures Express, security middleware, API routes and graceful shutdown.
 */
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./db');

const tasksRoutes = require('./routes/tasks');
const countdownRoutes = require('./routes/countdown');
const worldclockRoutes = require('./routes/worldclock');
const studySessionsRoutes = require('./routes/studySessions');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const pushRoutes = require('./routes/push');
const app = express();
const PORT = process.env.PORT || 3002;

// Behind proxies (Render/Fly/NGINX) so req.secure works
app.set('trust proxy', 1);

// Security headers (CSP/HSTS/etc.)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return next();
  });
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Middleware para JSON
app.use(express.json());

// --- NOVA ROTA PARA RESOLVER O "CANNOT GET /" ---
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
      <h1>StuddyBuddy API 🚀</h1>
      <p>O backend está online e funcionando!</p>
      <p>Acesse <a href="/api/health">/api/health</a> para verificar o status do banco de dados.</p>
    </div>
  `);
});
// ----------------------------------------------

// Rota de teste/health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ status: 'ok', db: state, message: 'StuddyBuddy API a funcionar 🚀' });
});

// Rotas principais da API
app.use('/api/tasks', tasksRoutes);
app.use('/api/countdown', countdownRoutes);
app.use('/api/worldclock', worldclockRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/push', pushRoutes);

// Fallback para erros 404 de API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Arranque do servidor
(async () => {
  await connectDB();

  let server = app.listen(PORT, () => {
    console.log(`🌐 Servidor API a correr em http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`\n🛑 Recebido ${signal}. A encerrar...`);
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.close(false);
      process.exit(0);
    } catch (err) {
      console.error('❌ Erro ao encerrar:', err?.message || err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  console.error('❌ Failed to start server:', err?.message || err);
  process.exit(1);
});