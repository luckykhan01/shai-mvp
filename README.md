# 🚀 Shai.pro Security Platform

**Платформа мониторинга безопасности с ML детекцией аномалий**

Система состоит из микросервисов:

- **log-generator** - генератор логов безопасности (3 типа: auth, firewall, app)
- **ml-detector** - ML-детектор аномалий с Isolation Forest
- **parser** - парсер и обработчик событий
- **ai-assistant** - AI ассистент для анализа угроз
- **frontend** - React веб-интерфейс для мониторинга

## ⚡ Быстрый старт для хакатона

### 🎯 Один клик - все работает!

```bash
# Запустить демо
make demo

# Или вручную:
make build && make up
```

### 🔍 Проверить работу

```bash
# Статус сервисов
make status

# Проверить здоровье
make health

# Посмотреть инциденты
make incidents

# Статистика ML-анализа
make ml-stats

# Симуляция блокировки
make demo-block
```

### Проверка статуса

```bash
# Статус всех сервисов
make status

# Проверка здоровья сервисов
make health

# Просмотр инцидентов
make incidents
```

## 🌐 Веб-интерфейс

После запуска откройте в браузере:
```
http://localhost:3000
```

Frontend предоставляет:
- 📊 Dashboard с общей статистикой
- 🛡️ Мониторинг аномалий в реальном времени
- 🌐 Список подозрительных IP адресов
- 📈 Детальная информация о каждом IP
- 🔒 Блокировка/разблокировка IP адресов
- 🤖 AI ассистент (в разработке)

## API Endpoints

### Frontend (порт 3000)
- `GET /` - веб-интерфейс
- `GET /anomalies` - страница аномалий
- `GET /ips` - список IP адресов
- `GET /ips/:ip` - детали IP

### Parser (порт 8000)
- `GET /health` - проверка здоровья
- `POST /ingest` - прием логов
- `GET /incidents` - список инцидентов

### ML Detector (порт 8001)
- `GET /healthz` - проверка здоровья
- `GET /anomalies` - список аномалий
- `GET /ips` - список IP адресов
- `POST /lists/deny` - блокировка IP

### AI Assistant (порт 8002)
- `GET /health` - проверка здоровья
- `GET /status` - статус безопасности
- `GET /analyze/{ip}` - анализ IP

## Управление сервисами

```bash
# Остановить все сервисы
make down

# Перезапустить все сервисы
make restart

# Перезапустить конкретный сервис
make restart-parser
make restart-ml
make restart-generator

# Просмотр логов
make logs                    # все сервисы
make logs-parser            # только parser
make logs-ml               # только ml-detector
make logs-generator        # только log-generator
```

## Демонстрация

```bash
# Симуляция блокировки IP
make demo-block

# Просмотр текущих инцидентов
make incidents
```

## Очистка

```bash
# Остановить и удалить все контейнеры и volumes
make clean

# Полная пересборка
make rebuild
```

## Архитектура

```
┌──────────────────┐
│  log-generators  │
│  (auth/fw/app)   │
└────────┬─────────┘
         │
         ↓
    ┌────────┐
    │ parser │  ──→  ┌─────────────┐
    └────┬───┘       │  shipper    │
         │           └──────┬──────┘
         ↓                  ↓
    ┌─────────┐      ┌─────────────┐      ┌──────────┐
    │ JSONL   │      │ ml-detector │ ←──→ │ postgres │
    │ файлы   │      │  (ML API)   │      └──────────┘
    └─────────┘      └──────┬──────┘
                            ↓
                     ┌──────────────┐
                     │ ai-assistant │
                     │  (Gemini AI) │
                     └──────┬───────┘
                            ↓
                     ┌──────────────┐
                     │   frontend   │
                     │  (React UI)  │
                     └──────────────┘
```

### Поток данных:
1. **log-generators** (3 типа) генерируют логи и отправляют в **parser**
2. **parser** нормализует события и сохраняет в JSONL файл
3. **shipper** читает JSONL файл и отправляет батчами в **ml-detector**
4. **ml-detector** анализирует через Isolation Forest и сохраняет в **postgres**
5. **ai-assistant** получает данные из ml-detector и анализирует через Gemini AI
6. **frontend** отображает все данные в красивом веб-интерфейсе

## Переменные окружения

### log-generator
- `PARSER_URL` - URL парсера (по умолчанию: http://parser:8000/ingest)
- `RATE` - частота генерации событий в секунду (по умолчанию: 5)
- `BATCH` - размер батча событий (по умолчанию: 5)

## Мониторинг

Все сервисы имеют health check endpoints и автоматически перезапускаются при сбоях.

Для просмотра метрик используйте:
```bash
docker stats
```
