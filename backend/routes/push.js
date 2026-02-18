/**
 * Web Push API: VAPID public key e registo de subscrições.
 * Para enviar notificações: usar webpush.sendNotification(subscription, payload).
 */
const express = require('express');
const webpush = require('web-push');
const jwt = require('jsonwebtoken');
const PushSubscription = require('../models/PushSubscription');

const router = express.Router();

// Chaves VAPID (gerar com: node scripts/generate-vapid-keys.js)
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    'mailto:studdybuddy@example.com',
    vapidPublic,
    vapidPrivate
  );
}

function getOptionalUserId(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token || !jwtSecret) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    // payload.sub is a string id (created in auth route)
    return payload?.sub || null;
  } catch {
    return null;
  }
}

/** GET /api/push/vapid-public — chave pública para o cliente subscrever */
router.get('/vapid-public', (req, res) => {
  if (!vapidPublic) {
    return res.status(503).json({
      message: 'Web Push não configurado. Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY (ver scripts/generate-vapid-keys.js).',
    });
  }
  res.json({ publicKey: vapidPublic });
});

/** POST /api/push/subscribe — guarda a subscrição para enviar notificações depois */
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Body deve ser uma PushSubscription (JSON).' });
    }
    
    // Validate subscription keys are present
    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ message: 'PushSubscription inválida: keys.p256dh e keys.auth são obrigatórios.' });
    }
    
    const userId = getOptionalUserId(req);
    const endpoint = subscription.endpoint;

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { subscription, userId: userId || null } },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Subscrição guardada.', endpoint });
  } catch (err) {
    console.error('Erro ao guardar subscrição push:', err);
    res.status(500).json({ message: 'Erro ao guardar subscrição' });
  }
});

/** POST /api/push/unsubscribe — remove a subscrição do servidor */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: 'endpoint é obrigatório' });
    
    // Get the authenticated user ID (if any)
    const userId = getOptionalUserId(req);
    
    // Find the subscription
    const existingSub = await PushSubscription.findOne({ endpoint });
    
    if (!existingSub) {
      return res.status(404).json({ message: 'Subscrição não encontrada.' });
    }
    
    // If user is authenticated, verify ownership
    if (userId) {
      // Convert to string for comparison (ObjectId to string)
      const subUserId = existingSub.userId ? existingSub.userId.toString() : null;
      if (subUserId !== userId) {
        return res.status(403).json({ message: 'Não tem permissão para remover esta subscrição.' });
      }
    }
    
    await PushSubscription.deleteOne({ endpoint });
    res.json({ message: 'Subscrição removida.' });
  } catch (err) {
    console.error('Erro ao remover subscrição push:', err);
    res.status(500).json({ message: 'Erro ao remover subscrição' });
  }
});

/** POST /api/push/send — envia uma notificação de teste a todas as subscrições (útil para desenvolvimento) */
router.post('/send', async (req, res) => {
  // Security: Only allow in development or require admin authentication
  if (process.env.NODE_ENV === 'production') {
    // Check for admin authentication
    const userId = getOptionalUserId(req);
    if (!userId) {
      return res.status(403).json({ message: 'Não autorizado em produção.' });
    }
    
    // Optionally check if user is admin (you can implement this based on your user model)
    // For now, just require authentication in production
  }
  
  if (!vapidPublic || !vapidPrivate) {
    return res.status(503).json({ message: 'Web Push não configurado.' });
  }
  try {
    const { title = 'StuddyBuddy', body = '', url = '/' } = req.body;
    
    // Validate and whitelist the data.url value for security
    const allowedPatterns = ['/', '/index.html', /^^\/[^/]/]; // Allow root and relative paths
    let safeUrl = url;
    
    // Only allow internal or explicitly trusted URL patterns
    if (url && !url.startsWith('/')) {
      // Reject external URLs to prevent phishing
      console.warn('Blocked external URL in push notification:', url);
      safeUrl = '/';
    }
    
    const payload = JSON.stringify({ title, body, data: { url: safeUrl } });
    const results = { sent: 0, failed: 0 };

    const subs = await PushSubscription.find().lean();
    for (const record of subs) {
      const sub = record.subscription;
      try {
        await webpush.sendNotification(sub, payload);
        results.sent++;
      } catch (e) {
        results.failed++;
        if (e.statusCode === 410 || e.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        }
      }
    }
    res.json({ message: 'Enviado.', ...results });
  } catch (err) {
    console.error('Erro ao enviar push:', err);
    res.status(500).json({ message: 'Erro ao enviar push' });
  }
});

module.exports = router;
