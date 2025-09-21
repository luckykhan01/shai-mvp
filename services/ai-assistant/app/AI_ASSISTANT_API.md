# AI Security Assistant API

AI ассистент для анализа безопасности и аномалий, использующий Gemini AI для анализа результатов ML детекции.

## Эндпоинты

### GET /health
Проверка здоровья сервиса AI ассистента.

**Ответ:**
```json
{
  "status": "ok",
  "service": "ai-assistant",
  "timestamp": "2024-01-15T10:30:45.123456+00:00",
  "ml_detector_connected": true
}
```

### GET /status
Получить общий статус безопасности с AI анализом.

**Ответ:**
```json
{
  "overall_status": "operational",
  "threat_level": "medium",
  "active_threats": 5,
  "blocked_ips": 2,
  "flagged_ips": 3,
  "recommendations": [
    "Monitor IP 192.168.1.100 for continued suspicious activity",
    "Consider implementing additional rate limiting",
    "Review firewall rules for flagged IPs"
  ],
  "last_analysis": "2024-01-15T10:30:45.123456+00:00"
}
```

**Поля ответа:**
- `overall_status`: Общий статус (`operational`, `threat_detected`)
- `threat_level`: Уровень угрозы (`low`, `medium`, `high`, `critical`)
- `active_threats`: Количество активных угроз
- `blocked_ips`: Количество заблокированных IP
- `flagged_ips`: Количество помеченных IP
- `recommendations`: Рекомендации от AI
- `last_analysis`: Время последнего анализа

### GET /analyze/{ip}
Анализировать конкретный IP адрес с помощью AI.

**Параметры:**
- `ip` (string, required): IP адрес для анализа

**Ответ:**
```json
{
  "ip": "192.168.1.100",
  "status": "threat_detected",
  "anomalies_count": 3,
  "latest_anomaly": {
    "ts": "2024-01-15T10:30:45.123456+00:00",
    "action": "block_ip",
    "ip": "192.168.1.100",
    "iso_score": -0.85,
    "recent_failed": 15.0,
    "recent_events": 25.0,
    "recent_fail_ratio": 0.6,
    "reason": "Too many failed logins in window"
  },
  "attack_analysis": {
    "attack_type": "Brute Force Attack",
    "severity": "high",
    "description": "Multiple failed login attempts detected from this IP",
    "indicators": [
      "High failure ratio (60%)",
      "Multiple failed attempts (15)",
      "Consistent attack pattern"
    ],
    "recommendations": [
      "Block this IP immediately",
      "Implement rate limiting",
      "Monitor for similar patterns"
    ],
    "confidence": 0.9
  }
}
```

**Поля ответа:**
- `ip`: Анализируемый IP адрес
- `status`: Статус IP (`clean`, `threat_detected`)
- `anomalies_count`: Количество аномалий для IP
- `latest_anomaly`: Последняя аномалия
- `attack_analysis`: AI анализ атаки
  - `attack_type`: Тип атаки
  - `severity`: Серьезность (`low`, `medium`, `high`, `critical`)
  - `description`: Описание атаки
  - `indicators`: Индикаторы атаки
  - `recommendations`: Рекомендации
  - `confidence`: Уверенность AI (0.0-1.0)

### GET /recommendations
Получить рекомендации по безопасности от AI.

**Ответ:**
```json
{
  "recommendations": [
    "Implement additional monitoring for high-risk IPs",
    "Consider updating firewall rules",
    "Review authentication logs for patterns"
  ],
  "threat_level": "medium",
  "attack_patterns": [
    "Brute Force",
    "DDoS",
    "Suspicious Login Patterns"
  ],
  "generated_at": "2024-01-15T10:30:45.123456+00:00"
}
```

### GET /summary
Получить краткую сводку по безопасности.

**Ответ:**
```json
{
  "summary": {
    "total_anomalies": 25,
    "blocked_ips": 5,
    "flagged_ips": 8,
    "whitelist_size": 12,
    "blacklist_size": 3,
    "threat_level": "medium"
  },
  "recent_anomalies": [
    {
      "ts": "2024-01-15T10:30:45.123456+00:00",
      "action": "block_ip",
      "ip": "192.168.1.100",
      "iso_score": -0.85,
      "reason": "Too many failed logins"
    }
  ],
  "top_suspicious_ips": [
    {
      "ip": "192.168.1.100",
      "recent_events": 25,
      "recent_failed": 15,
      "recent_fail_ratio": 0.6
    }
  ],
  "ai_analysis": {
    "threat_level": "medium",
    "active_threats": 25,
    "blocked_ips": 5,
    "flagged_ips": 8,
    "attack_patterns": ["Brute Force", "DDoS"],
    "recommendations": ["Monitor high-risk IPs", "Update firewall rules"]
  },
  "generated_at": "2024-01-15T10:30:45.123456+00:00"
}
```

## Конфигурация

### Переменные окружения

- `GEMINI_API_KEY`: API ключ для Gemini AI (обязательно)
- `ML_DETECTOR_URL`: URL ML детектора (по умолчанию: `http://ml-detector:8000`)
- `AI_ASSISTANT_PORT`: Порт AI ассистента (по умолчанию: `8002`)
- `AI_ASSISTANT_HOST`: Хост AI ассистента (по умолчанию: `0.0.0.0`)

### Пример .env файла

```bash
# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# ML Detector URL
ML_DETECTOR_URL=http://ml-detector:8000

# AI Assistant Configuration
AI_ASSISTANT_PORT=8002
AI_ASSISTANT_HOST=0.0.0.0
```

## Возможности AI ассистента

### Анализ аномалий
- Автоматический анализ аномалий с помощью Gemini AI
- Определение типов атак (Brute Force, DDoS, etc.)
- Оценка серьезности угроз
- Генерация рекомендаций

### Мониторинг IP адресов
- Анализ конкретных IP адресов
- Определение паттернов атак
- Оценка рисков
- Предоставление рекомендаций по блокировке

### Общий статус безопасности
- Агрегированный анализ всех угроз
- Уровень общей безопасности
- Количество активных угроз
- Статистика блокировок

### Рекомендации
- Персонализированные рекомендации по безопасности
- Анализ паттернов атак
- Предложения по улучшению защиты

## Интеграция

AI ассистент интегрируется с:
- **ML Detector**: Получает данные об аномалиях
- **Gemini AI**: Использует для анализа и генерации рекомендаций
- **PostgreSQL**: Через ML Detector для получения исторических данных

## Примеры использования

### Проверка статуса безопасности
```bash
curl http://localhost:8002/status
```

### Анализ подозрительного IP
```bash
curl http://localhost:8002/analyze/192.168.1.100
```

### Получение рекомендаций
```bash
curl http://localhost:8002/recommendations
```

### Полная сводка
```bash
curl http://localhost:8002/summary
```

## Коды ошибок

- `500`: Внутренняя ошибка сервера
- `404`: IP адрес не найден
- `503`: Сервис недоступен (проблемы с ML детектором или Gemini AI)

## Примечания

- AI ассистент требует активного подключения к ML детектору
- Все анализы выполняются в реальном времени
- Рекомендации генерируются на основе последних данных
- Поддерживается анализ до 100 аномалий одновременно
