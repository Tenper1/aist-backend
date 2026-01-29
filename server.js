const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Хранилище сессий
const sessions = {};

// CORS
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://aist-messenger-tenper1.vercel.app'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Отправка кода в Telegram
app.post('/api/send-code', async (req, res) => {
  const { telegramId } = req.body;

  if (!telegramId || isNaN(telegramId)) {
    return res.status(400).json({ error: 'Invalid telegramId. Must be numeric user ID.' });
  }

  const code = Math.random().toString().slice(2, 8);
  const userId = uuidv4();
  sessions[telegramId] = { code, userId };

  console.log(`[TG DEBUG] Sending code ${code} to Telegram ID ${telegramId}`);

  try {
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: telegramId,
      text: `🔐 Ваш код AIST: ${code}\n\nНикому не сообщайте его!`,
      parse_mode: 'HTML'
    });

    console.log('[TG SUCCESS] Code sent');
    res.json({ ok: true });

  } catch (error) {
    console.error('[TG ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send Telegram message' });
  }
});

// Проверка кода
app.post('/api/verify-code', (req, res) => {
  const { telegramId, code } = req.body;
  if (!telegramId || !code) {
    return res.status(400).json({ error: 'telegramId and code are required' });
  }

  const session = sessions[telegramId];
  if (session && session.code === code) {
    const { userId } = session;
    delete sessions[telegramId];
    res.json({ userId, token: 'dummy_jwt_for_mvp' });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AIST Backend running on port ${PORT}`);
  console.log(`📡 Telegram bot enabled`);
});