const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./db');

const tasksRoutes = require('./routes/tasks');
const countdownRoutes = require('./routes/countdown');
const worldclockRoutes = require('./routes/worldclock');
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
    // We use inline SVGs and Vite dev scripts; keep CSP off in dev.
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Force HTTPS in production (only when behind a proxy that sets x-forwarded-proto)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return next();
  });
}

// Liga ao MongoDB
let server = null;

// CORS middleware - permitir requests do Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware para JSON
app.use(express.json());

// Rota de teste/health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ status: 'ok', db: state, message: 'StuddyBuddy API a funcionar 🚀' });
});

// Rotas principais da API
app.use('/api/tasks', tasksRoutes);
app.use('/api/countdown', countdownRoutes);
app.use('/api/worldclock', worldclockRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/push', pushRoutes);

// Fallback simples para erros 404 de API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Arranque do servidor
(async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`🌐 Servidor API a correr em http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`\n🛑 Recebido ${signal}. A encerrar...`);
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      // Close DB connections so deploy platforms can recycle cleanly
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