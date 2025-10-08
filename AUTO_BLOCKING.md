# 🛡️ Автоматическая блокировка IP адресов

## ✅ Реализовано

### 1. **Автоматическая блокировка по ML**

SecureWatch теперь **автоматически блокирует** IP адреса при обнаружении подозрительной активности!

#### Критерии блокировки:

Система автоматически создает аномалию `block_ip` и добавляет IP в черный список, когда:

- **Процент неудачных попыток ≥ 60%** И
- **Минимум 10 неудачных попыток**

**До изменений:**
- Процент неудач ≥ 95% (слишком строго)
- Минимум 20 попыток (редко достигается)

**После изменений:**
- Процент неудач ≥ 60% ✅ (более реалистично)
- Минимум 10 попыток ✅ (легче достичь)

### 2. **Как это работает**

```
┌─────────────────┐
│  Log Generator  │ → SSH failed login from 192.168.1.100
└────────┬────────┘
         ↓
┌────────────────┐
│    Parser      │ → Нормализует событие
└────────┬───────┘
         ↓
┌────────────────┐
│    Shipper     │ → Отправляет в ML детектор
└────────┬───────┘
         ↓
┌────────────────────────────────┐
│    ML Detector                 │
├────────────────────────────────┤
│ 1. Анализирует IP:             │
│    - 15 попыток                │
│    - 12 неудачных (80%)        │
│                                │
│ 2. Проверка порогов:           │
│    ✓ 80% > 60% (порог)         │
│    ✓ 12 > 10 (мин. попыток)    │
│                                │
│ 3. Создает аномалию:           │
│    action = "block_ip"         │
│                                │
│ 4. Автоблокировка:             │
│    → Добавляет в deny_list     │
└────────────────────────────────┘
         ↓
┌────────────────┐
│   PostgreSQL   │ → IP в черном списке ✅
└────────┬───────┘
         ↓
┌────────────────┐
│   Frontend     │ → Показывает блокировку
└────────────────┘
```

### 3. **Что добавлено в код**

#### `docker-compose.yml`:
```yaml
environment:
  - HARD_FAIL_RATIO=0.6    # 60% неудач
  - HARD_FAIL_MIN=10       # Минимум 10 попыток
```

#### `mlmodel.py`:
Новый метод `_auto_block_ips()`:
```python
def _auto_block_ips(self, conn, actions):
    """Автоматически добавляет IP в черный список"""
    for act in actions:
        if act.get("action") == "block_ip":
            ip = act.get("ip")
            # Проверка существующей записи
            # Добавление в deny_list
            print(f"[AUTO-BLOCK] Added {ip} to blacklist")
```

## 📊 Мониторинг автоблокировок

### Через логи:
```bash
# Просмотр автоблокировок в реальном времени
docker-compose logs -f ml-detector | grep AUTO-BLOCK
```

Вы увидите:
```
[AUTO-BLOCK] Added 192.168.1.100 to blacklist: Too many failed logins...
```

### Через API:
```bash
# Аномалии с block_ip
curl http://localhost:8001/anomalies | jq '.anomalies[] | select(.action == "block_ip")'

# Черный список
curl http://localhost:8001/lists/deny
```

### Через UI:
1. **Dashboard** → Счетчик "Заблокировано IP" покажет количество
2. **Аномалии** → Фильтр "Заблокированные" покажет IP
3. **Блокировки** → Черный список покажет все заблокированные IP

## 🧪 Тестирование

### Способ 1: Дождаться естественной блокировки

Просто подождите 5-10 минут:
- Генераторы создают логи
- ML детектор анализирует
- Рано или поздно появится IP с высоким процентом неудач
- Автоматическая блокировка сработает

### Способ 2: Создать тестовый сценарий

Можете создать сценарий с brute-force атакой:

```bash
# Запустить генератор в режиме brute-force
docker-compose exec auth-generator python3 generator_auth.py --scenario brute_force --rate 5
```

### Способ 3: Ручная проверка логики

```bash
# Добавить IP вручную для проверки UI
curl -X POST http://localhost:8001/lists/deny \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ip",
    "value": "192.168.1.100",
    "description": "Test block"
  }'

# Проверить в UI
open http://localhost:3000/blocklist
```

## 📈 Примеры аномалий

### flag_ip (помечено):
```json
{
  "action": "flag_ip",
  "ip": "185.23.54.11",
  "iso_score": -0.616,
  "recent_failed": 0,
  "recent_events": 5,
  "recent_fail_ratio": 0.0,
  "reason": "Anomalous by IsolationForest"
}
```

### block_ip (заблокировано) ⭐:
```json
{
  "action": "block_ip",
  "ip": "192.168.1.100",
  "iso_score": -0.85,
  "recent_failed": 12,
  "recent_events": 15,
  "recent_fail_ratio": 0.80,
  "reason": "Too many failed logins in window (recent_failed=12, recent_fail_ratio=0.80)"
}
```

## 🎯 Настройка порогов

Если вы хотите изменить пороги блокировки, отредактируйте `docker-compose.yml`:

```yaml
ml-detector:
  environment:
    # Более строгие пороги (меньше блокировок)
    - HARD_FAIL_RATIO=0.8   # 80% неудач
    - HARD_FAIL_MIN=15      # Минимум 15 попыток
    
    # Более мягкие пороги (больше блокировок)
    - HARD_FAIL_RATIO=0.4   # 40% неудач
    - HARD_FAIL_MIN=5       # Минимум 5 попыток
```

Затем перезапустите:
```bash
docker-compose up -d ml-detector
```

## 📊 Статистика

Для просмотра статистики блокировок:

```bash
# Количество block_ip аномалий
curl -s http://localhost:8001/anomalies?limit=200 | \
  jq '.anomalies[] | select(.action == "block_ip") | .ip' | \
  sort | uniq | wc -l

# Топ-10 заблокированных IP
curl -s http://localhost:8001/anomalies?limit=200 | \
  jq -r '.anomalies[] | select(.action == "block_ip") | .ip' | \
  sort | uniq -c | sort -rn | head -10

# Черный список
curl -s http://localhost:8001/lists/deny | jq '.items | length'
```

## 🔔 Уведомления

В логах ML детектора будут сообщения:

```
[AUTO-BLOCK] Added 192.168.1.100 to blacklist: Too many failed logins...
[AUTO-BLOCK] Added 10.0.0.50 to blacklist: Too many failed logins...
```

## ⚙️ Технические детали

### База данных

Автоблокированные IP хранятся в таблице `deny_list`:

```sql
SELECT * FROM public.deny_list 
WHERE item_type = 'ip' 
AND description LIKE 'Auto-blocked:%';
```

### Конфликты

Если IP уже в черном списке, повторное добавление будет пропущено:
```python
SELECT id FROM deny_list WHERE item_type = 'ip' AND value = %s
```

## 🎉 Итог

**SecureWatch** теперь полностью автоматизирован:

✅ **Обнаружение** - ML детектор анализирует события
✅ **Решение** - Автоматически принимает решение о блокировке
✅ **Действие** - Добавляет IP в черный список
✅ **Мониторинг** - Все отображается в UI в реальном времени

Никаких ручных действий не требуется! 🚀

---

**Текущие пороги:**
- 60% неудачных попыток
- Минимум 10 попыток
- Окно анализа: 60 минут

**Обновление данных:**
- Dashboard: каждые 2 секунды
- Блокировки: каждые 5 секунд


