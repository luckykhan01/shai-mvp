# Интеграция фронтенда с бэкендом

## Обзор

Фронтенд успешно интегрирован с бэкендом и готов к использованию. Проект включает в себя:

- **Next.js 14** фронтенд с TypeScript
- **Tailwind CSS** для стилизации
- **Radix UI** компоненты
- **Recharts** для графиков
- **API клиент** для связи с бэкендом

## Запуск проекта

### Полный запуск (включая AI Assistant)
```bash
# Установите GEMINI_API_KEY для AI Assistant
export GEMINI_API_KEY="your-gemini-api-key"
docker-compose up --build -d
```

### Запуск без AI Assistant (рекомендуется для тестирования)
```bash
docker-compose up -d postgres parser ml-detector shipper auth-generator fw-generator app-generator frontend
```

## Доступные сервисы

- **Фронтенд**: http://localhost:3000
- **ML Detector API**: http://localhost:8001
- **Parser API**: http://localhost:8000
- **PostgreSQL**: localhost:5433

## Структура фронтенда

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Главная страница
│   ├── layout.tsx         # Корневой layout
│   └── globals.css        # Глобальные стили
├── components/            # React компоненты
│   ├── anomalies-overview.tsx  # Обзор аномалий
│   ├── events-viewer.tsx      # Просмотр событий
│   ├── ip-monitor.tsx         # Мониторинг IP
│   ├── export-panel.tsx       # Панель экспорта
│   └── ui/                    # UI компоненты
├── lib/
│   └── api.ts             # API клиент
└── hooks/                 # React хуки
```

## API интеграция

Фронтенд подключен к следующим API эндпоинтам:

### ML Detector API (порт 8001)
- `GET /anomalies` - получение аномалий
- `GET /anomalies/{ip}` - аномалии по IP
- `GET /features/{ip}` - события по IP
- `GET /ips` - список IP адресов
- `GET /export/actions.ndjson` - экспорт данных
- `GET/POST/DELETE /lists/allow` - управление whitelist
- `GET/POST/DELETE /lists/deny` - управление blacklist
- `POST /suppress` - подавление оповещений

### AI Assistant API (порт 8002)
- `POST /chat` - чат с AI
- `GET /recommendations` - рекомендации

## Компоненты

### AnomaliesOverview
- Отображает статистику аномалий
- График трендов
- Список последних аномалий
- Фильтрация и поиск

### EventsViewer
- Просмотр событий безопасности
- Фильтрация по результату и сервису
- Детальная информация о событиях

### IPMonitor
- Мониторинг IP адресов
- Управление списками разрешений/блокировок
- Статистика активности

### ExportPanel
- Экспорт данных в NDJSON
- Настройка фильтров времени

## Настройка

### Переменные окружения
```bash
NEXT_PUBLIC_API_BASE_URL=http://ml-detector:8000
NEXT_PUBLIC_AI_ASSISTANT_URL=http://ai-assistant:8002
```

### Docker
Фронтенд собирается в Docker контейнер с:
- Node.js 18 Alpine
- pnpm для управления пакетами
- Standalone режим Next.js
- Оптимизированная сборка

## Разработка

### Локальная разработка
```bash
cd frontend
pnpm install
pnpm dev
```

### Сборка
```bash
cd frontend
pnpm build
```

## Особенности

1. **Реальное время**: Компоненты автоматически обновляются при изменении данных
2. **Обработка ошибок**: Показ ошибок API с возможностью повторной попытки
3. **Адаптивный дизайн**: Работает на всех устройствах
4. **Темная тема**: Поддержка темной темы из коробки
5. **TypeScript**: Полная типизация для безопасности

## Мониторинг

Для проверки статуса сервисов:
```bash
docker-compose ps
docker-compose logs frontend
docker-compose logs ml-detector
```

## Следующие шаги

1. Настройте GEMINI_API_KEY для AI Assistant
2. Добавьте аутентификацию если необходимо
3. Настройте мониторинг и алерты
4. Добавьте дополнительные фильтры и аналитику
