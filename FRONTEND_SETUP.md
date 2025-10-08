# Frontend Setup Guide

Полное руководство по настройке и запуску React frontend для Shai.pro.

## 🎯 Быстрый старт

### Запуск с Docker Compose (Рекомендуется)

```bash
# Запустить всю систему (backend + frontend)
docker-compose up -d

# Проверить статус
docker-compose ps

# Открыть в браузере
open http://localhost:3000
```

### Локальная разработка

```bash
# Перейти в директорию frontend
cd frontend

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev

# Открыть в браузере
open http://localhost:3000
```

## 📋 Требования

- Node.js 20+ (для локальной разработки)
- Docker & Docker Compose (для контейнеризации)
- Backend сервисы должны быть запущены (ML Detector, AI Assistant)

## 🏗️ Архитектура

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│  Frontend       │
│  (React + Vite) │
│  Port: 3000     │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌─────────────┐
│ ML     │ │ AI          │
│ Detect │ │ Assistant   │
│ :8001  │ │ :8002       │
└────────┘ └─────────────┘
```

## 🔧 Конфигурация

### Для Docker (Production)

Frontend использует Nginx как reverse proxy. API запросы автоматически проксируются:
- `/api/ml/*` → `http://ml-detector:8000/*`
- `/api/ai/*` → `http://ai-assistant:8002/*`

Конфигурация в `nginx.conf`.

### Для локальной разработки

Создайте `.env.local` в директории `frontend/`:

```env
# Backend URLs
VITE_ML_DETECTOR_URL=http://localhost:8001
VITE_AI_ASSISTANT_URL=http://localhost:8002

# Refresh intervals (ms)
VITE_ANOMALIES_REFRESH_INTERVAL=5000
VITE_IPS_REFRESH_INTERVAL=10000
```

Vite автоматически проксирует запросы через `vite.config.ts`:
- `/api/ml/*` → `${VITE_ML_DETECTOR_URL}/*`
- `/api/ai/*` → `${VITE_AI_ASSISTANT_URL}/*`

## 📦 Команды

### Docker

```bash
# Собрать frontend image
docker-compose build frontend

# Запустить только frontend
docker-compose up -d frontend

# Остановить frontend
docker-compose stop frontend

# Перезапустить frontend
docker-compose restart frontend
# или
make restart-frontend

# Просмотр логов
docker-compose logs -f frontend
# или
make logs-frontend
```

### Локальная разработка

```bash
# Установить зависимости
npm install

# Запустить dev сервер
npm run dev

# Собрать для продакшена
npm run build

# Превью продакшен сборки
npm run preview

# Проверить код
npm run lint
```

### Makefile команды

```bash
# Запустить в режиме разработки
make frontend-dev

# Собрать для продакшена
make frontend-build

# Просмотр логов Docker
make logs-frontend

# Перезапустить контейнер
make restart-frontend
```

## 🎨 Компоненты и страницы

### Страницы

1. **Dashboard** (`/`)
   - Обзор системы безопасности
   - Статистика (аномалии, IP, блокировки)
   - Последние аномалии

2. **Anomalies** (`/anomalies`)
   - Таблица всех аномалий
   - Фильтрация (все / заблокированные / помеченные)
   - Сортировка и пагинация

3. **IPs List** (`/ips`)
   - Список подозрительных IP адресов
   - Поиск по IP
   - Уровень угрозы

4. **IP Details** (`/ips/:ip`)
   - Детальная информация об IP
   - История аномалий
   - События и логи
   - Блокировка/разблокировка

5. **AI Assistant** (`/assistant`)
   - Placeholder для AI помощника
   - Будет добавлено позже

### Компоненты

- `Layout` - главный layout с навигацией
- `Card` - карточка для контента
- `Badge` - цветные метки
- `Button` - кнопки с разными вариантами
- `AnomalyTable` - таблица аномалий
- `StatsCard` - карточка статистики

## 🔌 API Интеграция

Frontend взаимодействует с двумя backend сервисами:

### ML Detector API (порт 8001)

```typescript
// Получить аномалии
GET /api/ml/anomalies?limit=50

// Аномалии для IP
GET /api/ml/anomalies/{ip}

// События для IP
GET /api/ml/features/{ip}

// Список IP
GET /api/ml/ips

// Блокировка IP
POST /api/ml/lists/deny
{
  "type": "ip",
  "value": "192.168.1.100",
  "description": "Заблокирован"
}

// Разблокировка IP
DELETE /api/ml/lists/deny
{
  "item_type": "ip",
  "value": "192.168.1.100"
}
```

### AI Assistant API (порт 8002)

```typescript
// Статус безопасности
GET /api/ai/status

// Анализ IP
GET /api/ai/analyze/{ip}

// Сводка
GET /api/ai/summary

// Рекомендации
GET /api/ai/recommendations
```

## 🐛 Отладка

### Frontend не загружается

```bash
# Проверить статус контейнера
docker-compose ps frontend

# Проверить логи
docker-compose logs frontend

# Перезапустить
docker-compose restart frontend
```

### API запросы не работают

```bash
# Проверить backend сервисы
docker-compose ps ml-detector ai-assistant

# Проверить их логи
docker-compose logs ml-detector
docker-compose logs ai-assistant

# Проверить health
curl http://localhost:8001/healthz
curl http://localhost:8002/health
```

### Ошибки при сборке

```bash
# Очистить кэш и пересобрать
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Локальная разработка

```bash
# Очистить node_modules и пересобрать
rm -rf node_modules package-lock.json
npm install

# Проверить порты
lsof -i :3000  # Frontend
lsof -i :8001  # ML Detector
lsof -i :8002  # AI Assistant
```

## 🚀 Деплой

### Production build

```bash
# Собрать продакшен образ
docker-compose build frontend

# Запустить
docker-compose up -d frontend

# Проверить
curl http://localhost:3000
```

### Оптимизация

Frontend автоматически:
- ✅ Минифицирует JS/CSS
- ✅ Сжимает статику (gzip)
- ✅ Кэширует assets (1 год)
- ✅ Использует Nginx для оптимальной производительности

## 📊 Мониторинг

```bash
# Статус контейнера
docker-compose ps frontend

# Использование ресурсов
docker stats shai-frontend

# Логи в реальном времени
docker-compose logs -f frontend

# Health check
curl http://localhost:3000
```

## 🔒 Безопасность

Frontend настроен с учетом безопасности:

- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- ✅ CORS настроен на backend
- ✅ API запросы через proxy (нет прямого доступа)
- ✅ Минимальный Docker образ (Alpine)
- ✅ Non-root пользователь в контейнере

## 📱 Responsive Design

Frontend адаптирован для:
- 💻 Desktop (1920x1080+)
- 💻 Laptop (1366x768+)
- 📱 Tablet (768x1024)
- 📱 Mobile (> 375px)

## 🎯 Следующие шаги

1. ✅ Базовый UI готов
2. ✅ Интеграция с ML Detector
3. ✅ Блокировка/разблокировка IP
4. ⏳ AI Assistant интеграция
5. ⏳ Графики и визуализация
6. ⏳ Уведомления в реальном времени
7. ⏳ Экспорт данных
8. ⏳ Темная тема

## 📝 Дополнительная информация

- [Frontend README](./frontend/README.md)
- [API Documentation](./services/ml-detector/app/ANOMALIES_API.md)
- [AI Assistant API](./services/ai-assistant/app/AI_ASSISTANT_API.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)


