# Shai.pro Frontend

Современный веб-интерфейс для платформы мониторинга безопасности Shai.pro.

## 🚀 Возможности

- 📊 **Dashboard** - обзор системы безопасности в реальном времени
- 🛡️ **Мониторинг аномалий** - отслеживание подозрительной активности
- 🌐 **Управление IP** - просмотр и блокировка подозрительных IP адресов
- 📈 **Детальная аналитика** - подробная информация о каждом IP и событии
- 🤖 **AI Ассистент** - умный помощник для анализа угроз (в разработке)
- 🔄 **Автообновление** - данные обновляются автоматически каждые 5-10 секунд
- 🎨 **Современный UI** - красивый интерфейс с TailwindCSS

## 🛠️ Технологии

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - быстрая сборка
- **TanStack Query** - управление состоянием и кэширование
- **React Router** - маршрутизация
- **TailwindCSS** - стилизация
- **Axios** - HTTP клиент
- **Lucide React** - иконки

## 📦 Установка и запуск

### Локальная разработка

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev

# Собрать для продакшена
npm run build

# Превью продакшен сборки
npm run preview
```

### Docker

```bash
# Собрать образ
docker build -t shai-frontend .

# Запустить контейнер
docker run -p 3000:3000 shai-frontend
```

### Docker Compose (рекомендуется)

```bash
# Из корневой директории проекта
docker-compose up -d frontend
```

## 🔧 Конфигурация

Создайте файл `.env.local` в корне frontend директории:

```env
# Backend API URLs (для локальной разработки)
VITE_ML_DETECTOR_URL=http://localhost:8001
VITE_AI_ASSISTANT_URL=http://localhost:8002

# Refresh intervals (milliseconds)
VITE_ANOMALIES_REFRESH_INTERVAL=5000
VITE_IPS_REFRESH_INTERVAL=10000
```

## 📁 Структура проекта

```
frontend/
├── src/
│   ├── components/      # UI компоненты
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Layout.tsx
│   │   ├── AnomalyTable.tsx
│   │   └── StatsCard.tsx
│   ├── pages/          # Страницы
│   │   ├── Dashboard.tsx
│   │   ├── Anomalies.tsx
│   │   ├── IpsList.tsx
│   │   ├── IpDetails.tsx
│   │   └── Assistant.tsx
│   ├── lib/            # Утилиты и API
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── types/          # TypeScript типы
│   │   └── index.ts
│   ├── App.tsx         # Главный компонент
│   ├── main.tsx        # Точка входа
│   └── index.css       # Глобальные стили
├── public/             # Статические файлы
├── Dockerfile          # Docker конфигурация
├── nginx.conf          # Nginx конфигурация
├── vite.config.ts      # Vite конфигурация
├── tailwind.config.js  # Tailwind конфигурация
└── package.json        # Зависимости
```

## 🌐 API Интеграция

Frontend интегрируется с двумя backend сервисами:

### ML Detector (порт 8001)
- `GET /anomalies` - получить аномалии
- `GET /anomalies/{ip}` - аномалии для IP
- `GET /features/{ip}` - события для IP
- `GET /ips` - список IP адресов
- `POST/DELETE /lists/deny` - управление блокировками

### AI Assistant (порт 8002)
- `GET /status` - общий статус безопасности
- `GET /analyze/{ip}` - анализ IP
- `GET /summary` - краткая сводка
- `GET /recommendations` - рекомендации

## 🎨 Основные компоненты

### Dashboard
- Статистика безопасности
- График активности
- Последние аномалии
- Быстрые действия

### Anomalies
- Таблица всех аномалий
- Фильтрация по типу (блокировка/метка)
- Сортировка и пагинация
- Детальная информация

### IP Details
- История аномалий для IP
- События и логи
- Блокировка/разблокировка
- Статистика активности

### AI Assistant (в разработке)
- Анализ угроз
- Рекомендации
- Объяснения аномалий

## 🔒 Безопасность

- CORS настроен на backend
- Прокси через Nginx для API запросов
- Security headers в Nginx
- XSS защита
- HTTPS ready

## 📝 Лицензия

MIT © 2025 Shai.pro


