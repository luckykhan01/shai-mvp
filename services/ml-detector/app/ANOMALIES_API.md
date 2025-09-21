# Anomalies API Endpoints

## GET /anomalies

Получает последние аномалии из базы данных.

## GET /anomalies/{ip}

Получает аномалии для конкретного IP адреса.

## GET /features/{ip}

Получает события (логи) для конкретного IP адреса.

## GET /ips

Получает список IP адресов с краткой статистикой.

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

**Общие поля:**
- `count`: Фактическое количество возвращенных записей
- `limit`: Запрошенный лимит
- `ip`: IP адрес (для эндпоинтов с IP)

### Коды ошибок

- `500`: Внутренняя ошибка сервера (проблемы с БД, инициализация модели)
- `400`: Некорректные параметры запроса

### Примечания

- Аномалии возвращаются в порядке убывания времени (самые новые первыми)
- Если в базе данных нет аномалий, возвращается пустой массив
- Эндпоинт требует инициализированную модель и подключение к PostgreSQL
