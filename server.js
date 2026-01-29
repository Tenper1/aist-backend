const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Хранилище: phone → { code, userId }
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

// Отправка SMS на номер телефона
app.post('/api/send-sms', async (req, res) => {
  const { phone } = req.body;

  // Валидация формата
  if (!phone || !/^\+?7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone. Use +79991234567' });
  }

  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone; // 79255445330

  const code = Math.random().toString().slice(2, 8);
  const userId = uuidv4();
  sessions[cleanPhone] = { code, userId };

  console.log(`[SMS] Sending ${code} to ${cleanTime}`);

  try {
    // Отправляем БЕЗ sender ID и с нейтральным текстом
    const response = await axios.get('https://smsc.ru/sys/send.php', {
      params: {
        login: process.env.SMSC_LOGIN,
        psw: process.env.SMSC_PASSWORD,
        phones: cleanPhone,
        mes: code, // Только цифры!
        fmt: 3
      },
      timeout: 10000
    });

    const data = response.data;
    if (data.error) {
      console.error('[SMS ERROR]', data);
      return res.status(500).json({ error: 'SMS failed', details: data.error });
    }

    console.log('[SMS SUCCESS]');
    res.json({ ok: true });

  } catch (e) {
    console.error('[SMS EXCEPTION]', e.message);
    res.status(500).json({ error: 'SMS service down' });
  }
});

// Проверка кода по номеру
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AIST Backend running on port ${PORT}`);
});