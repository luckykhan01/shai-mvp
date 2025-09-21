#!/bin/bash

echo "🔍 Тестирование интеграции Frontend с Backend"
echo "=============================================="

# Проверка доступности сервисов
echo "1. Проверка доступности сервисов..."

# Проверка ML Detector
echo -n "ML Detector (порт 8001): "
if curl -s http://localhost:8001/anomalies > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
    echo "   Запустите: docker-compose up -d ml-detector"
    exit 1
fi

# Проверка AI Assistant
echo -n "AI Assistant (порт 8002): "
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
    echo "   Запустите: docker-compose up -d ai-assistant"
fi

# Проверка Frontend
echo -n "Frontend (порт 3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
    echo "   Запустите: docker-compose up -d frontend"
fi

echo ""
echo "2. Тестирование API endpoints..."

# Тест получения аномалий
echo -n "GET /anomalies: "
response=$(curl -s -w "%{http_code}" http://localhost:8001/anomalies)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ OK"
else
    echo "❌ HTTP $http_code"
fi

# Тест получения IP адресов
echo -n "GET /ips: "
response=$(curl -s -w "%{http_code}" http://localhost:8001/ips)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ OK"
else
    echo "❌ HTTP $http_code"
fi

echo ""
echo "3. Проверка данных..."

# Проверка наличия аномалий
anomalies_count=$(curl -s http://localhost:8001/anomalies | jq '.count // 0' 2>/dev/null || echo "0")
echo "Количество аномалий: $anomalies_count"

# Проверка наличия IP адресов
ips_count=$(curl -s http://localhost:8001/ips | jq '.count // 0' 2>/dev/null || echo "0")
echo "Количество IP адресов: $ips_count"

echo ""
echo "4. Рекомендации:"

if [ "$anomalies_count" = "0" ]; then
    echo "⚠️  Нет аномалий. Убедитесь, что:"
    echo "   - Генераторы логов запущены: docker-compose up -d auth-generator fw-generator app-generator"
    echo "   - Parser обрабатывает данные: docker-compose logs parser"
    echo "   - ML Detector обучается: docker-compose logs ml-detector"
fi

if [ "$ips_count" = "0" ]; then
    echo "⚠️  Нет IP адресов. Проверьте логи ML Detector:"
    echo "   docker-compose logs ml-detector"
fi

echo ""
echo "5. Следующие шаги:"
echo "   - Откройте http://localhost:3000 в браузере"
echo "   - Проверьте отображение данных в таблице"
echo "   - Протестируйте фильтрацию и блокировку IP"
echo "   - Проверьте автообновление данных"

echo ""
echo "✅ Тестирование завершено!"
