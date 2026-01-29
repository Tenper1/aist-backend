#!/bin/bash
echo "Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Установка зависимостей..."
npm install

echo "Запуск бэкенда в фоне..."
nohup npm start > backend.log 2>&1 &
echo "Бэкенд запущен!"