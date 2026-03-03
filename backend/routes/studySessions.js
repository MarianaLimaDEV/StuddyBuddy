const express = require('express');
const StudySession = require('../models/StudySession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/study-sessions - lista todas as sessões do utilizador
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };
    
    // Optional date range filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    
    const sessions = await StudySession.find(query).sort({ date: -1 }).limit(500);
    res.json(sessions);
  } catch (err) {
    console.error('Erro ao obter sessões de estudo:', err);
    res.status(500).json({ message: 'Erro ao obter sessões de estudo' });
  }
});

// GET /api/study-sessions/stats - obter estatísticas agregadas
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { userId: req.user.userId };
    
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }
    
    const result = await StudySession.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$minutes' },
          sessionCount: { $sum: 1 },
        },
      },
    ]);
    
    const stats = result[0] || { totalMinutes: 0, sessionCount: 0 };
    res.json(stats);
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
});

// POST /api/study-sessions - cria uma nova sessão
router.post('/', requireAuth, async (req, res) => {
  try {
    const { minutes, date, type } = req.body;

    if (!minutes || !date) {
      return res.status(400).json({ message: 'minutes e date são obrigatórios' });
    }

    if (typeof minutes !== 'number' || minutes < 1) {
      return res.status(400).json({ message: 'minutes deve ser um número positivo' });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date deve estar no formato YYYY-MM-DD' });
    }

    const session = await StudySession.create({
      userId: req.user.userId,
      minutes,
      date,
      type: type || 'pomodoro',
    });

    res.status(201).json(session);
  } catch (err) {
    console.error('Erro ao criar sessão de estudo:', err);
    res.status(500).json({ message: 'Erro ao criar sessão de estudo' });
  }
});

// DELETE /api/study-sessions/:id - remove uma sessão
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await StudySession.findOneAndDelete({ 
      _id: id,
      userId: req.user.userId 
    });

    if (!session) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    res.json({ message: 'Sessão removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover sessão de estudo:', err);
    res.status(500).json({ message: 'Erro ao remover sessão de estudo' });
  }
});

module.exports = router;

