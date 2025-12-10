#!/bin/bash

echo "🚀 AI Tutor Platform - Quick Start"
echo "=================================="

# Проверка наличия Python
echo "📋 Проверка зависимостей..."
if ! command -v python &> /dev/null; then
    echo "❌ Python3 не установлен"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Python3 и Node.js установлены"

# Настройка backend
echo ""
echo "🔧 Настройка Backend..."
cd backend

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    python3 -m venv venv
fi

# Активация виртуального окружения
echo "📦 Активация виртуального окружения..."
source venv/bin/activate

# Установка зависимостей
echo "📦 Установка Python зависимостей..."
pip install -r requirements.txt

# Проверка .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден"
    echo "   Получите API ключ на https://platform.openai.com/api-keys"
    echo "   И добавьте его в файл backend/.env"
fi

echo "✅ Backend настроен"

# Настройка frontend
echo ""
echo "🎨 Настройка Frontend..."
cd ../frontend

# Установка зависимостей
echo "📦 Установка npm зависимостей..."
npm install

echo "✅ Frontend настроен"

# Инструкции
echo ""
echo "🎉 Установка завершена!"
echo ""
echo "📖 Инструкции по запуску:"
echo "1. Добавьте OPENAI_API_KEY в backend/.env"
echo "2. Запустите backend:"
echo "   cd backend && source venv/bin/activate && python main.py"
echo "3. В новом терминале запустите frontend:"
echo "   cd frontend && npm run dev"
echo "4. Откройте http://localhost:5173"
echo ""
echo "📚 Пример материала: example-material.txt"
echo "🚀 Удачи на хакатоне!"