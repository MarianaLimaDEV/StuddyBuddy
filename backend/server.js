const express = require('express');
const connectDB = require('./db');

const tasksRoutes = require('./routes/tasks');
const countdownRoutes = require('./routes/countdown');
const worldclockRoutes = require('./routes/worldclock');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

// Liga ao MongoDB
connectDB();

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
  res.json({ status: 'ok', message: 'StuddyBuddy API a funcionar 🚀' });
});

// Rotas principais da API
app.use('/api/tasks', tasksRoutes);
app.use('/api/countdown', countdownRoutes);
app.use('/api/worldclock', worldclockRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// Fallback simples para erros 404 de API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Arranque do servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor API a correr em http://localhost:${PORT}`);
});