const express = require('express');

const router = express.Router();

function getEnv(name) {
  return process.env[name] && String(process.env[name]).trim();
}

// POST /api/chat
// Body: { message: string, history?: Array<{role:'user'|'assistant'|'system', content:string}> }
router.post('/', async (req, res) => {
  try {
    const apiKey = getEnv('OPENAI_API_KEY');
    if (!apiKey) {
      return res.status(500).json({
        message: 'OPENAI_API_KEY não definido no servidor. Configure no ficheiro .env.',
      });
    }

    const baseUrl = getEnv('OPENAI_BASE_URL') || 'https://api.openai.com';
    const model = getEnv('OPENAI_MODEL') || 'gpt-4o-mini';

    const message = req.body?.message;
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'message é obrigatório' });
    }

    // Keep history small to control cost
    const trimmedHistory = history
      .filter(m => m && typeof m === 'object' && typeof m.role === 'string' && typeof m.content === 'string')
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    const system = {
      role: 'system',
      content:
        'Você é o assistente do StuddyBuddy. Responda em português (pt-PT/pt-BR ok), curto e prático. ' +
        'Ajude com: login/cadastro, tema/som, Pomodoro, Timer, Cronómetro, Task List, Countdown e World Clock. ' +
        'Se faltar informação, faça 1 pergunta objetiva.',
    };

    const payload = {
      model,
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        system,
        ...trimmedHistory,
        { role: 'user', content: message.trim() },
      ],
    };

    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({
        message: 'Falha ao chamar a API do chatbot',
        status: r.status,
        details: text.slice(0, 400),
      });
    }

    const data = await r.json();
    const reply =
      data?.choices?.[0]?.message?.content &&
      String(data.choices[0].message.content).trim();

    if (!reply) {
      return res.status(502).json({ message: 'Resposta inválida do provedor de chat' });
    }

    return res.json({ reply });
  } catch (err) {
    console.error('Erro no /api/chat:', err);
    return res.status(500).json({ message: 'Erro interno no chat' });
  }
});

module.exports = router;

