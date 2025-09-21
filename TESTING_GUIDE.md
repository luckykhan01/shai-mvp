# Руководство по тестированию интеграции

## Проверка работы системы

### 1. Проверка сервисов
```bash
# Проверить статус всех контейнеров
docker-compose ps

# Проверить логи фронтенда
docker-compose logs frontend

# Проверить логи ML Detector
docker-compose logs ml-detector
```

### 2. Проверка API
```bash
# Проверить API аномалий
curl http://localhost:8001/anomalies | jq '.count'

# Проверить API IP адресов
curl http://localhost:8001/ips | jq '.count'

# Проверить API событий (замените IP на реальный)
curl http://localhost:8001/features/192.168.1.100 | jq '.count'
```

### 3. Проверка фронтенда

1. Откройте http://localhost:3000 в браузере
2. Вы должны увидеть компонент "API Test" в верхней части
3. Через 2 секунды автоматически запустится тест API
4. Проверьте консоль браузера (F12) на наличие сообщений:
   - "Testing API..."
   - "API response: ..." (при успехе)
   - Ошибки (при проблемах)

### 4. Ожидаемые результаты

**При успешной работе:**
- Зеленое сообщение "Success! Found X anomalies"
- JSON данные с аномалиями в компоненте
- Статистика обновляется в реальном времени

**При ошибках:**
- Красное сообщение с описанием ошибки
- Проверьте консоль браузера для деталей
- Проверьте логи сервисов

### 5. Возможные проблемы и решения

#### CORS ошибки
- **Проблема**: "Access to fetch at 'http://localhost:8001/anomalies' from origin 'http://localhost:3000' has been blocked by CORS policy"
- **Решение**: Проверьте настройки CORS в `services/ml-detector/app/main.py`

#### Сетевые ошибки
- **Проблема**: "Failed to fetch" или "Network error"
- **Решение**: 
  - Проверьте, что ML Detector запущен: `docker-compose ps`
  - Проверьте доступность API: `curl http://localhost:8001/anomalies`

#### Ошибки данных
- **Проблема**: "API request failed: 500 Internal Server Error"
- **Решение**: 
  - Проверьте логи ML Detector: `docker-compose logs ml-detector`
  - Проверьте подключение к базе данных

### 6. Отладка

#### Включить отладочные логи
```bash
# В логах фронтенда ищите:
# "Making API request to: http://localhost:8001/anomalies?limit=5"
# "API response: {...}"

# В логах ML Detector ищите:
# "INFO: 127.0.0.1:XXXXX - "GET /anomalies HTTP/1.1" 200 OK"
```

#### Проверка переменных окружения
```bash
# Проверить переменные в контейнере фронтенда
docker exec shai-frontend env | grep NEXT_PUBLIC
```

#### Тестирование API напрямую
```bash
# Тест CORS
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:8001/anomalies

# Тест API
curl -H "Origin: http://localhost:3000" http://localhost:8001/anomalies
```

### 7. Восстановление после ошибок

```bash
# Перезапуск всех сервисов
docker-compose restart

# Пересборка и перезапуск
docker-compose up --build -d

# Очистка и полный перезапуск
docker-compose down
docker-compose up --build -d
```

### 8. Мониторинг в реальном времени

```bash
# Следить за логами всех сервисов
docker-compose logs -f

# Следить только за фронтендом
docker-compose logs -f frontend

# Следить только за ML Detector
docker-compose logs -f ml-detector
```

## Результат

При успешной работе вы должны увидеть:
- ✅ Фронтенд загружается на http://localhost:3000
- ✅ API тест показывает "Success! Found X anomalies"
- ✅ Данные отображаются в реальном времени
- ✅ Нет ошибок в консоли браузера
- ✅ Нет ошибок в логах сервисов
