# AI Security Assistant

AI ассистент для анализа безопасности и аномалий, использующий Gemini AI для анализа результатов ML детекции.

## Возможности

- 🤖 **AI анализ аномалий** - автоматический анализ аномалий с помощью Gemini AI
- 🎯 **Анализ IP адресов** - детальный анализ подозрительных IP адресов
- 📊 **Статус безопасности** - общий статус системы безопасности
- 💡 **Рекомендации** - персонализированные рекомендации по улучшению безопасности
- 📈 **Сводка безопасности** - комплексная сводка по состоянию безопасности

## Быстрый старт

### 1. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# Gemini AI API Key (обязательно)
GEMINI_API_KEY=your_gemini_api_key_here

# ML Detector URL
ML_DETECTOR_URL=http://ml-detector:8000

# AI Assistant Configuration
AI_ASSISTANT_PORT=8002
AI_ASSISTANT_HOST=0.0.0.0
```

### 2. Получение API ключа Gemini

1. Перейдите на [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Создайте новый API ключ
3. Скопируйте ключ в переменную `GEMINI_API_KEY`

### 3. Запуск сервиса

```bash
# Запуск всех сервисов включая AI ассистента
docker-compose up -d

# Проверка статуса AI ассистента
curl http://localhost:8002/health
```

## API Эндпоинты

### Основные эндпоинты

- `GET /health` - проверка здоровья сервиса
- `GET /status` - общий статус безопасности
- `GET /analyze/{ip}` - анализ конкретного IP адреса
- `GET /recommendations` - рекомендации по безопасности
- `GET /summary` - сводка по безопасности

### Примеры запросов

```bash
# Проверка статуса
curl http://localhost:8002/status

# Анализ IP адреса
curl http://localhost:8002/analyze/192.168.1.100

# Получение рекомендаций
curl http://localhost:8002/recommendations

# Полная сводка
curl http://localhost:8002/summary
```

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │    │   ML Detector   │    │   PostgreSQL    │
│   (Port 8002)   │◄──►│   (Port 8001)   │◄──►│   (Port 5433)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gemini AI     │    │   Anomalies     │    │   Events DB     │
│   (External)     │    │   Detection     │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `GEMINI_API_KEY` | API ключ Gemini AI | **Обязательно** |
| `ML_DETECTOR_URL` | URL ML детектора | `http://ml-detector:8000` |
| `AI_ASSISTANT_PORT` | Порт сервиса | `8002` |
| `AI_ASSISTANT_HOST` | Хост сервиса | `0.0.0.0` |

### Docker конфигурация

```yaml
ai-assistant:
  build: ./services/ai-assistant
  container_name: shai-ai-assistant
  ports:
    - "8002:8002"
  environment:
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - ML_DETECTOR_URL=http://ml-detector:8000
  depends_on:
    ml-detector:
      condition: service_healthy
```

## Разработка

### Локальная разработка

```bash
# Установка зависимостей
cd services/ai-assistant
pip install -r requirements.txt

# Запуск в режиме разработки
python main.py
```

### Тестирование

```bash
# Запуск тестов
curl http://localhost:8002/health

# Тестирование анализа
curl http://localhost:8002/analyze/192.168.1.100
```

## Мониторинг

### Health Check

```bash
curl http://localhost:8002/health
```

**Ответ:**
```json
{
  "status": "ok",
  "service": "ai-assistant",
  "timestamp": "2024-01-15T10:30:45.123456+00:00",
  "ml_detector_connected": true
}
```

### Логи

```bash
# Просмотр логов AI ассистента
docker-compose logs ai-assistant

# Просмотр логов в реальном времени
docker-compose logs -f ai-assistant
```

## Безопасность

### Рекомендации

1. **API ключи**: Храните API ключи в переменных окружения
2. **Сеть**: Ограничьте доступ к портам сервиса
3. **Логи**: Регулярно проверяйте логи на предмет ошибок
4. **Обновления**: Регулярно обновляйте зависимости

### Ограничения

- AI ассистент требует активного подключения к ML детектору
- Все анализы выполняются в реальном времени
- Поддерживается анализ до 100 аномалий одновременно

## Устранение неполадок

### Частые проблемы

1. **Ошибка подключения к ML детектору**
   ```bash
   # Проверьте статус ML детектора
   curl http://localhost:8001/healthz
   ```

2. **Ошибка API ключа Gemini**
   ```bash
   # Проверьте переменную окружения
   echo $GEMINI_API_KEY
   ```

3. **Сервис не запускается**
   ```bash
   # Проверьте логи
   docker-compose logs ai-assistant
   ```

### Отладка

```bash
# Подключение к контейнеру
docker-compose exec ai-assistant bash

# Проверка переменных окружения
docker-compose exec ai-assistant env | grep GEMINI
```

## Лицензия

MIT License
