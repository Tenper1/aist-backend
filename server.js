const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Хранилище сессий: phone → { code, userId }
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

// Отправка SMS через SMSAero
app.post('/api/send-sms', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^\+?7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone. Use +79991234567' });
  }

  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone; // 79255445330
  const code = Math.random().toString().slice(2, 8);
  const userId = uuidv4();
  sessions[cleanPhone] = { code, userId };

  console.log(`[SMSAero] Sending ${code} to ${cleanPhone}`);

  try {
    // Запрос к SMSAero
    const response = await axios.post(
      'https://api.smsaero.ru/v2/sms/send',
      {
        number: cleanPhone,
        text: `Ваш код: ${code}`, // можно добавить текст
        sign: 'SMS Aero'           // имя отправителя (можно менять)
      },
      {
        auth: {
          username: process.env.SMSAERO_EMAIL,
          password: process.env.SMSAERO_API_KEY
        },
        timeout: 10000
      }
    );

    const data = response.data;
    if (data.success) {
      console.log('[SMSAero SUCCESS]');
      res.json({ ok: true });
    } else {
      console.error('[SMSAero ERROR]', data);
      res.status(500).json({ error: 'SMS failed', details: data.message });
    }

  } catch (e) {
    console.error('[SMSAero EXCEPTION]', e.response?.data || e.message);
    res.status(500).json({ error: 'SMS service unavailable' });
  }
});

// Проверка кода
app.post('/api/verify-code', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;
  const session = sessions[cleanPhone];

  if (session && session.code === code) {
    const { userId } = session;
    delete sessions[cleanPhone];
    res.json({ userId, token: 'dummy_jwt' });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AIST Backend running on port ${PORT}`);
  console.log(`📡 SMS provider: SMSAero`);
});