# Интеграция Frontend с Backend

## Обзор изменений

Интеграция frontend с backend включает следующие изменения:

### 1. Новые типы данных
- Добавлены типы для backend API (`Anomaly`, `Event`, `IpInfo`, etc.)
- Сохранена обратная совместимость с legacy типами (`LegacyEvent`, `LegacyEventsResponse`)

### 2. Обновленный API слой
- Заменен `fakeBaseQuery` на `fetchBaseQuery` для реальных HTTP запросов
- Добавлены новые endpoints: `getAnomalies`, `getAnomaliesByIp`, `getEventsByIp`, `getIps`
- Сохранены legacy endpoints для обратной совместимости
- Добавлена обработка ошибок и конвертация данных

### 3. Конфигурация
- Создан файл `src/shared/config.ts` для настроек API
- Поддержка переменных окружения для URL backend сервисов

### 4. Обработка ошибок
- Добавлена обработка ошибок подключения к backend
- Показ пользователю понятных сообщений об ошибках
- Кнопка "Попробовать снова" для повторных попыток

## Запуск системы

### 1. Запуск backend сервисов
```bash
# В корневой директории проекта
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5433)
- Parser (порт 8000)
- ML Detector (порт 8001)
- AI Assistant (порт 8002)
- Frontend (порт 3000)

### 2. Проверка статуса сервисов
```bash
# Проверить статус всех контейнеров
docker-compose ps

# Проверить логи ML Detector
docker-compose logs ml-detector

# Проверить логи Frontend
docker-compose logs frontend
```

### 3. Тестирование API endpoints

#### Проверка ML Detector API:
```bash
# Получить аномалии
curl http://localhost:8001/anomalies

# Получить IP адреса
curl http://localhost:8001/ips

# Получить события для конкретного IP
curl http://localhost:8001/features/192.168.1.100
```

#### Проверка AI Assistant API:
```bash
# Проверить здоровье сервиса
curl http://localhost:8002/health
```

## Настройка переменных окружения

Создайте файл `.env.local` в директории `frontend/`:

```env
# Backend API URLs
VITE_ML_DETECTOR_URL=http://localhost:8001
VITE_AI_ASSISTANT_URL=http://localhost:8002
```

## Тестирование интеграции

### 1. Откройте frontend
Перейдите на http://localhost:3000

### 2. Проверьте основные функции:
- ✅ Загрузка данных с backend
- ✅ Отображение аномалий в таблице
- ✅ Фильтрация по типу, IP, score
- ✅ Блокировка/разблокировка IP
- ✅ Просмотр деталей событий
- ✅ Автообновление данных

### 3. Проверьте обработку ошибок:
- Остановите ML Detector: `docker-compose stop ml-detector`
- Обновите страницу - должно появиться сообщение об ошибке
- Запустите обратно: `docker-compose start ml-detector`
- Нажмите "Попробовать снова"

## Структура API

### Основные endpoints:
- `GET /anomalies` - получить аномалии
- `GET /anomalies/{ip}` - аномалии для конкретного IP
- `GET /features/{ip}` - события для IP
- `GET /ips` - список IP адресов
- `POST /lists/deny` - заблокировать IP
- `DELETE /lists/deny` - разблокировать IP

### Формат данных:
- Аномалии содержат: timestamp, action, ip, iso_score, reason
- События содержат: event_id, source_ip, user, service, outcome, message
- IP информация: ip, recent_events, recent_failed, recent_fail_ratio

## Устранение неполадок

### 1. Frontend не подключается к backend
- Проверьте, что ML Detector запущен: `docker-compose ps`
- Проверьте URL в конфигурации
- Проверьте логи: `docker-compose logs frontend`

### 2. Нет данных в таблице
- Проверьте, что генерируются логи: `docker-compose logs auth-generator`
- Проверьте, что Parser работает: `docker-compose logs parser`
- Проверьте, что ML Detector обрабатывает данные: `docker-compose logs ml-detector`

### 3. Ошибки CORS
- Убедитесь, что frontend и backend запущены на правильных портах
- Проверьте настройки CORS в backend сервисах

## Дальнейшее развитие

1. **Добавить новые компоненты:**
   - График аномалий по времени
   - Статистика по IP адресам
   - Экспорт данных

2. **Улучшить UX:**
   - Уведомления о новых аномалиях
   - Настройки автообновления
   - Темная тема

3. **Добавить новые функции:**
   - Поиск по событиям
   - Группировка аномалий
   - Настройка фильтров
