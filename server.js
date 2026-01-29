const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Временная заглушка — без БД и Redis
app.post('/api/send-sms', async (req, res) => {
  const { phone } = req.body;
  const code = Math.random().toString().slice(2, 8);
  console.log(`SMS code for ${phone}: ${code}`);
  // В реальности — сохранить в Redis и отправить через smsc.ru
  res.json({ ok: true });
});

app.post('/api/verify-code', (req, res) => {
  const userId = uuidv4();
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ userId, token });
});

app.get('/api/profile', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});