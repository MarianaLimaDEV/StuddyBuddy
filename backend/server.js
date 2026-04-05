/**
 * StuddyBuddy API — Express + MongoDB
 */
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const studySessionsRoutes = require('./routes/studySessions');
const tasksRoutes = require('./routes/tasks');
const countdownRoutes = require('./routes/countdown');
const worldclockRoutes = require('./routes/worldclock');
const pushRoutes = require('./routes/push');

const app = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return next();
  });
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
      <h1>StuddyBuddy API</h1>
      <p><a href="/api/health">/api/health</a></p>
    </div>
  `);
});

app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ status: 'ok', db: state, message: 'StuddyBuddy API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/countdown', countdownRoutes);
app.use('/api/worldclock', worldclockRoutes);
app.use('/api/push', pushRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

(async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`API http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`\nShutting down (${signal})…`);
      await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.close(false);
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
