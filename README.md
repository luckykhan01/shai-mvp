# 🚀 Shai.pro Security Platform

**Платформа мониторинга безопасности для хакатона**

Система состоит из трех микросервисов:

- **log-generator** - генератор логов безопасности
- **ml-detector** - ML-детектор аномалий  
- **parser** - парсер и обработчик событий

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

## API Endpoints

### Parser (порт 8000)
- `GET /healthz` - проверка здоровья
- `POST /ingest` - прием логов
- `GET /incidents` - список инцидентов
- `POST /simulate_block` - симуляция блокировки IP

### ML Detector (порт 8001)
- `GET /healthz` - проверка здоровья
- `POST /detect` - детекция аномалий

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
log-generator → parser → ml-detector
     ↓           ↓         ↓
  генерирует  нормализует  анализирует
   логи      события     и детектирует
            и хранит     аномалии
            инциденты
```

### Поток данных:
1. **log-generator** генерирует логи и отправляет их в **parser**
2. **parser** нормализует события и отправляет их в **ml-detector** для анализа
3. **ml-detector** анализирует события и возвращает оценки подозрительности
4. **parser** создает инциденты на основе ML-анализа (score > 0.5)

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
