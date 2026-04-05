const express = require('express');

const router = express.Router();

router.get('/vapid-public', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ message: 'Push não configurado (VAPID_PUBLIC_KEY em falta)' });
  return res.json({ publicKey: key });
});

router.post('/subscribe', (req, res) => {
  return res.status(501).json({ message: 'Push subscribe não implementado nesta versão mínima do servidor.' });
});

router.post('/unsubscribe', (req, res) => {
  return res.status(501).json({ message: 'Push unsubscribe não implementado.' });
});

router.post('/test', (req, res) => {
  return res.status(501).json({ message: 'Push test não implementado.' });
});

module.exports = router;
