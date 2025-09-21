# Anomalies API Endpoints

## GET /anomalies

Получает последние аномалии из базы данных.

## GET /anomalies/{ip}

Получает аномалии для конкретного IP адреса.

## GET /features/{ip}

Получает события (логи) для конкретного IP адреса.

## GET /ips

Получает список IP адресов с краткой статистикой.

## GET /export/actions.ndjson

Экспортирует аномалии в формате NDJSON для интеграции с SIEM системами.

## GET/POST/DELETE /lists/allow

Управление списком разрешений (whitelist) для IP адресов, пользователей и сетей.

## GET/POST/DELETE /lists/deny

Управление списком блокировок (blacklist) для IP адресов, пользователей и сетей.

## POST /suppress

Временное подавление оповещений по IP адресу, пользователю или паттерну на указанное количество минут.

### Параметры запроса

**GET /anomalies:**
- `limit` (int, optional): Количество аномалий для возврата (по умолчанию: 20)

**GET /anomalies/{ip}:**
- `ip` (string, required): IP адрес для поиска аномалий
- `limit` (int, optional): Количество аномалий для возврата (по умолчанию: 50)

**GET /features/{ip}:**
- `ip` (string, required): IP адрес для поиска событий
- `limit` (int, optional): Количество событий для возврата (по умолчанию: 100)

**GET /ips:**
- `limit` (int, optional): Количество IP адресов для возврата (по умолчанию: 100)

**GET /export/actions.ndjson:**
- `since` (string, optional): Начальная дата в формате ISO 8601 (например: `2024-01-01T00:00:00Z`)
- `until` (string, optional): Конечная дата в формате ISO 8601 (например: `2024-12-31T23:59:59Z`)
- `limit` (int, optional): Максимальное количество записей для экспорта (по умолчанию: 10000)

**GET /lists/allow и GET /lists/deny:**
- `limit` (int, optional): Количество записей для возврата (по умолчанию: 100)

**POST /lists/allow и POST /lists/deny:**
- `type` (string, required): Тип элемента (`ip`, `user`, `network`)
- `value` (string, required): Значение (IP адрес, имя пользователя или сеть)
- `description` (string, optional): Описание записи
- `expires_at` (string, optional): Дата истечения в формате ISO 8601

**DELETE /lists/allow и DELETE /lists/deny:**
- `item_id` (int, optional): ID записи для удаления
- `item_type` (string, optional): Тип элемента (`ip`, `user`, `network`)
- `value` (string, optional): Значение для удаления
- Примечание: Можно использовать либо `item_id`, либо комбинацию `item_type` и `value`

**POST /suppress:**
- `type` (string, required): Тип подавления (`ip`, `user`, `pattern`)
- `value` (string, required): Значение для подавления
- `minutes` (int, required): Количество минут для подавления
- `description` (string, optional): Описание подавления

### Примеры запросов

```bash
# Получить 20 последних аномалий (по умолчанию)
GET http://localhost:8001/anomalies

# Получить 5 последних аномалий
GET http://localhost:8001/anomalies?limit=5

# Получить 50 последних аномалий
GET http://localhost:8001/anomalies?limit=50

# Получить аномалии для конкретного IP (по умолчанию 50)
GET http://localhost:8001/anomalies/192.168.1.100

# Получить 10 аномалий для конкретного IP
GET http://localhost:8001/anomalies/10.0.0.50?limit=10

# Получить события для конкретного IP (по умолчанию 100)
GET http://localhost:8001/features/192.168.1.100

# Получить 20 событий для конкретного IP
GET http://localhost:8001/features/10.0.0.50?limit=20

# Получить список IP адресов (по умолчанию 100)
GET http://localhost:8001/ips

# Получить 50 IP адресов
GET http://localhost:8001/ips?limit=50

# Экспортировать все аномалии в NDJSON (по умолчанию до 10000 записей)
GET http://localhost:8001/export/actions.ndjson

# Экспортировать последние 100 аномалий
GET http://localhost:8001/export/actions.ndjson?limit=100

# Экспортировать аномалии за период
GET http://localhost:8001/export/actions.ndjson?since=2024-01-01T00:00:00Z&until=2024-12-31T23:59:59Z

# Экспортировать аномалии за период с лимитом
GET http://localhost:8001/export/actions.ndjson?since=2024-01-01T00:00:00Z&until=2024-12-31T23:59:59Z&limit=1000

# Получить список разрешений (whitelist)
GET http://localhost:8001/lists/allow

# Получить список блокировок (blacklist)
GET http://localhost:8001/lists/deny

# Добавить IP в список разрешений
POST http://localhost:8001/lists/allow
Content-Type: application/json
{
  "type": "ip",
  "value": "192.168.1.100",
  "description": "Trusted server"
}

# Добавить пользователя в список разрешений
POST http://localhost:8001/lists/allow
Content-Type: application/json
{
  "type": "user",
  "value": "admin",
  "description": "Administrator account"
}

# Добавить сеть в список разрешений
POST http://localhost:8001/lists/allow
Content-Type: application/json
{
  "type": "network",
  "value": "10.0.0.0/8",
  "description": "Internal network"
}

# Добавить IP в список блокировок
POST http://localhost:8001/lists/deny
Content-Type: application/json
{
  "type": "ip",
  "value": "192.168.1.200",
  "description": "Known attacker"
}

# Удалить IP из списка разрешений по типу и значению
DELETE http://localhost:8001/lists/allow
Content-Type: application/json
{
  "item_type": "ip",
  "value": "192.168.1.100"
}

# Удалить IP из списка блокировок по ID
DELETE http://localhost:8001/lists/deny
Content-Type: application/json
{
  "item_id": 1
}

# Подавить оповещения для IP на 30 минут
POST http://localhost:8001/suppress
Content-Type: application/json
{
  "type": "ip",
  "value": "192.168.1.150",
  "minutes": 30,
  "description": "Maintenance window"
}

# Подавить оповещения для пользователя на 60 минут
POST http://localhost:8001/suppress
Content-Type: application/json
{
  "type": "user",
  "value": "testuser",
  "minutes": 60,
  "description": "Testing phase"
}
```

### Формат ответа

**GET /anomalies и GET /anomalies/{ip}:**
```json
{
  "anomalies": [
    {
      "ts": "2024-01-15T10:30:45.123456+00:00",
      "action": "block_ip",
      "ip": "192.168.1.100",
      "iso_score": -0.85,
      "recent_failed": 15.0,
      "recent_events": 25.0,
      "recent_fail_ratio": 0.6,
      "reason": "Too many failed logins in window (recent_failed=15, recent_fail_ratio=0.60)"
    }
  ],
  "count": 1,
  "limit": 20,
  "ip": "192.168.1.100"
}
```

**GET /features/{ip}:**
```json
{
  "events": [
    {
      "event_id": "evt_12345",
      "ts": "2024-01-15T10:30:45.123456+00:00",
      "source_ip": "192.168.1.100",
      "source_port": 12345,
      "dest_ip": "10.0.0.1",
      "dest_port": 22,
      "user": "admin",
      "service": "ssh",
      "sensor": "firewall",
      "event_type": "auth",
      "action": "login",
      "outcome": "failure",
      "message": "Invalid password",
      "protocol": "tcp",
      "bytes": 1024.0,
      "scenario": "brute_force",
      "metadata": {}
    }
  ],
  "count": 1,
  "ip": "192.168.1.100",
  "limit": 100
}
```

**GET /ips:**
```json
{
  "ips": [
    {
      "ip": "192.168.1.100",
      "recent_events": 25,
      "recent_failed": 15,
      "recent_fail_ratio": 0.6
    },
    {
      "ip": "10.0.0.50",
      "recent_events": 10,
      "recent_failed": 2,
      "recent_fail_ratio": 0.2
    }
  ],
  "count": 2,
  "limit": 100
}
```

**GET /export/actions.ndjson:**
```
{"timestamp": "2024-01-15T10:30:45.123456+00:00", "action": "block_ip", "source_ip": "192.168.1.100", "anomaly_score": -0.85, "recent_failed_attempts": 15, "recent_total_events": 25, "failure_ratio": 0.6, "reason": "Too many failed logins in window", "event_type": "anomaly_detection", "severity": "high", "source": "ml-detector", "exported_at": "2024-01-15T10:35:00.000000+00:00"}
{"timestamp": "2024-01-15T10:25:30.987654+00:00", "action": "flag_ip", "source_ip": "10.0.0.50", "anomaly_score": -0.75, "recent_failed_attempts": 5, "recent_total_events": 10, "failure_ratio": 0.5, "reason": "Suspicious login pattern", "event_type": "anomaly_detection", "severity": "medium", "source": "ml-detector", "exported_at": "2024-01-15T10:35:00.000000+00:00"}
```

**GET /lists/allow и GET /lists/deny:**
```json
{
  "items": [
    {
      "id": 1,
      "type": "ip",
      "value": "192.168.1.100",
      "description": "Trusted server",
      "created_at": "2024-01-15T10:30:45.123456+00:00",
      "expires_at": null
    },
    {
      "id": 2,
      "type": "user",
      "value": "admin",
      "description": "Administrator account",
      "created_at": "2024-01-15T10:31:00.123456+00:00",
      "expires_at": "2024-12-31T23:59:59+00:00"
    }
  ],
  "count": 2,
  "limit": 100
}
```

**POST /lists/allow и POST /lists/deny:**
```json
{
  "id": 3,
  "type": "ip",
  "value": "192.168.1.200",
  "description": "New trusted server",
  "created_at": "2024-01-15T10:35:00.123456+00:00",
  "expires_at": null
}
```

**DELETE /lists/allow и DELETE /lists/deny:**
```json
{
  "deleted": true,
  "count": 1
}
```

**POST /suppress:**
```json
{
  "id": 1,
  "type": "ip",
  "value": "192.168.1.150",
  "description": "Maintenance window",
  "created_at": "2024-01-15T10:35:00.123456+00:00",
  "expires_at": "2024-01-15T11:05:00.123456+00:00",
  "minutes": 30
}
```

### Поля ответа

**Для аномалий (`/anomalies`, `/anomalies/{ip}`):**
- `anomalies`: Массив объектов аномалий
  - `ts`: Временная метка аномалии (ISO 8601)
  - `action`: Действие (`block_ip` или `flag_ip`)
  - `ip`: IP-адрес источника
  - `iso_score`: Оценка аномальности от IsolationForest (меньше = более аномально)
  - `recent_failed`: Количество неудачных попыток в окне
  - `recent_events`: Общее количество событий в окне
  - `recent_fail_ratio`: Отношение неудачных попыток к общему количеству
  - `reason`: Причина классификации как аномалии

**Для событий (`/features/{ip}`):**
- `events`: Массив объектов событий
  - `event_id`: Уникальный идентификатор события
  - `ts`: Временная метка события (ISO 8601)
  - `source_ip`: IP-адрес источника
  - `source_port`: Порт источника
  - `dest_ip`: IP-адрес назначения
  - `dest_port`: Порт назначения
  - `user`: Пользователь
  - `service`: Сервис
  - `sensor`: Сенсор
  - `event_type`: Тип события
  - `action`: Действие
  - `outcome`: Результат (`success`, `failure`, `blocked`, `error`, `deny`)
  - `message`: Сообщение
  - `protocol`: Протокол
  - `bytes`: Количество байт
  - `scenario`: Сценарий
  - `metadata`: Дополнительные метаданные (JSON объект)

**Для IP адресов (`/ips`):**
- `ips`: Массив объектов IP адресов
  - `ip`: IP адрес
  - `recent_events`: Количество недавних событий
  - `recent_failed`: Количество неудачных попыток
  - `recent_fail_ratio`: Отношение неудачных попыток к общему количеству

**Для экспорта (`/export/actions.ndjson`):**
- Каждая строка содержит JSON объект с полями:
  - `timestamp`: Временная метка аномалии (ISO 8601)
  - `action`: Действие (`block_ip` или `flag_ip`)
  - `source_ip`: IP-адрес источника
  - `anomaly_score`: Оценка аномальности от IsolationForest
  - `recent_failed_attempts`: Количество неудачных попыток в окне
  - `recent_total_events`: Общее количество событий в окне
  - `failure_ratio`: Отношение неудачных попыток к общему количеству
  - `reason`: Причина классификации как аномалии
  - `event_type`: Тип события (всегда `anomaly_detection`)
  - `severity`: Уровень серьезности (`high` для `block_ip`, `medium` для `flag_ip`)
  - `source`: Источник данных (всегда `ml-detector`)
  - `exported_at`: Время экспорта (ISO 8601)

**Для списков (`/lists/allow`, `/lists/deny`):**
- `items`: Массив объектов списка
  - `id`: Уникальный идентификатор записи
  - `type`: Тип элемента (`ip`, `user`, `network`)
  - `value`: Значение (IP адрес, имя пользователя или сеть)
  - `description`: Описание записи
  - `created_at`: Время создания (ISO 8601)
  - `expires_at`: Время истечения (ISO 8601, может быть null)
- `count`: Количество записей в ответе
- `limit`: Запрошенный лимит

**Для подавления (`/suppress`):**
- `id`: Уникальный идентификатор подавления
- `type`: Тип подавления (`ip`, `user`, `pattern`)
- `value`: Значение для подавления
- `description`: Описание подавления
- `created_at`: Время создания (ISO 8601)
- `expires_at`: Время истечения подавления (ISO 8601)
- `minutes`: Количество минут подавления

**Общие поля:**
- `count`: Фактическое количество возвращенных записей
- `limit`: Запрошенный лимит
- `ip`: IP адрес (для эндпоинтов с IP)

**Заголовки ответа для `/export/actions.ndjson`:**
- `Content-Type`: `application/x-ndjson`
- `Content-Disposition`: `attachment; filename=anomalies_YYYYMMDD_HHMMSS.ndjson`
- `X-Total-Count`: Количество записей в экспорте
- `X-Since`: Начальная дата фильтра (если указана)
- `X-Until`: Конечная дата фильтра (если указана)
- `X-Limit`: Максимальный лимит записей

### Коды ошибок

- `500`: Внутренняя ошибка сервера (проблемы с БД, инициализация модели)
- `400`: Некорректные параметры запроса

### Примечания

- Аномалии возвращаются в порядке убывания времени (самые новые первыми)
- Если в базе данных нет аномалий, возвращается пустой массив
- Эндпоинт требует инициализированную модель и подключение к PostgreSQL
- Формат NDJSON удобен для интеграции с SIEM системами (Splunk, ELK, QRadar)
- Каждая строка в NDJSON содержит один JSON объект
- Файл автоматически скачивается с временной меткой в имени
- Поддерживается фильтрация по времени для экспорта исторических данных
- Списки разрешений и блокировок поддерживают типы: `ip`, `user`, `network`
- Записи в списках могут иметь срок действия (`expires_at`)
- Подавление оповещений работает временно и автоматически истекает
- Все операции с списками логируются и сохраняются в базе данных
