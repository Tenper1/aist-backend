const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Хранилище сессий (в памяти, для MVP)
const sessions = {};

// CORS — разрешаем запросы с localhost (для теста)
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

// Отправка SMS
app.post('/api/send-sms', async (req, res) => {
  const { phone } = req.body;

  // Валидация номера
  if (!phone || !/^\+?7\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone format. Use +79991234567' });
  }

  // Нормализуем номер: убираем +
  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;

  // Генерируем код
  const code = Math.random().toString().slice(2, 8);
  const userId = uuidv4();

  // Сохраняем сессию
  sessions[cleanPhone] = { code, userId };

  console.log(`[SMS DEBUG] Sending code ${code} to ${cleanPhone}`);

  try {
    // Отправка через smsc.ru
    const response = await axios.get('https://smsc.ru/sys/send.php', {
      params: {
        login: process.env.SMSC_LOGIN,
        psw: process.env.SMSC_PASSWORD,
        phones: cleanPhone,
        mes: `AIST: ${code}`,       // Формат, одобренный для имени AIST
        sender: 'AIST',              // Обязательно!
        fmt: 3                       // JSON-ответ
      },
      timeout: 10000
    });

    const data = response.data;
    if (data.error) {
      console.error('[SMS ERROR]', data);
      return res.status(500).json({ error: 'SMS delivery failed', details: data.error });
    }

    console.log('[SMS SUCCESS] Message sent');
    res.json({ ok: true });

  } catch (error) {
    console.error('[SMS EXCEPTION]', error.message);
    res.status(500).json({ error: 'SMS service unavailable' });
  }
});

// Проверка кода
app.post('/api/verify-code', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required' });
  }

  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;
  const session = sessions[cleanPhone];

  if (session && session.code === code) {
    const { userId } = session;
    delete sessions[cleanPhone]; // одноразовый код

    res.json({
      userId,
      token: 'dummy_jwt_for_mvp' // в продакшене — реальный JWT
    });
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
  console.log(`📡 SMS sender: AIST`);
});