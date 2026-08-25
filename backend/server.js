const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// Провайдеры и их эндпоинты
const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` })
  },
  yandex: {
    url: 'https://llm.api.cloud.yandex.net/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Api-Key ${key}` })
  }
};

app.post('/api/ai/:provider', async (req, res) => {
  const providerKey = req.params.provider;
  const provider = PROVIDERS[providerKey];

  if (!provider) {
    return res.status(400).json({ error: `Неизвестный провайдер: ${providerKey}` });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Заголовок X-API-Key обязателен' });
  }

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.authHeader(apiKey)
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Ошибка прокси', message: err.message });
  }
});

// Health-check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`AI-proxy запущен на порту ${PORT}`);
});
