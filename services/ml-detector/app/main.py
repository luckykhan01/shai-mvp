from __future__ import annotations
import os, json, gzip, logging, asyncio
import datetime as dt
from datetime import timedelta
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, conlist
from starlette.responses import JSONResponse

from mlmodel import (IsoForestPerIP)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
MODEL_PATH = os.getenv("MODEL_PATH", "isoforest_perip.joblib")
ACTIONS_PATH = os.getenv("ACTIONS_PATH", "actions.jsonl")

N_ESTIMATORS = int(os.getenv("N_ESTIMATORS", "200"))
CONTAMINATION = float(os.getenv("CONTAMINATION", "0.1"))
WINDOW_MINUTES = int(os.getenv("WINDOW_MINUTES", "10"))
MIN_TRAIN_ROWS = int(os.getenv("MIN_TRAIN_ROWS", "5"))
RETRAIN_EVERY = int(os.getenv("RETRAIN_EVERY", "1"))
HARD_FAIL_RATIO = float(os.getenv("HARD_FAIL_RATIO", "0.95"))
HARD_FAIL_MIN = int(os.getenv("HARD_FAIL_MIN", "20"))
BATCH_TARGET = int(os.getenv("BATCH_TARGET", "200"))  # необязательный чек

RETRAIN_INTERVAL_SEC = int(os.getenv("RETRAIN_INTERVAL_SEC", "300"))   # каждые 5 минут
RETRAIN_LOOKBACK_MIN = int(os.getenv("RETRAIN_LOOKBACK_MIN", "60"))    # окно выборки из БД (последний час)
RETRAIN_DB_LIMIT     = int(os.getenv("RETRAIN_DB_LIMIT", "20000"))     # ограничение строк из БД
WARMUP_FROM_DB       = int(os.getenv("WARMUP_FROM_DB", "1"))           # подогреться из БД на старте

# Database configuration
PG_DSN = os.getenv("PG_DSN", "postgresql://ml:ml@localhost:5432/mlengine")
PG_SCHEMA = os.getenv("PG_SCHEMA", "public")
PG_MINCONN = int(os.getenv("PG_MINCONN", "1"))
PG_MAXCONN = int(os.getenv("PG_MAXCONN", "5"))

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("serve_isoforest")

class EventsBatch(BaseModel):
    events: conlist(Dict[str, Any], min_length=1)

class ListItem(BaseModel):
    type: str
    value: str
    description: Optional[str] = None
    expires_at: Optional[str] = None

class SuppressItem(BaseModel):
    type: str
    value: str
    minutes: int
    description: Optional[str] = None

class DeleteItem(BaseModel):
    item_id: Optional[int] = None
    item_type: Optional[str] = None
    value: Optional[str] = None

model: Optional[IsoForestPerIP] = None

_retrain_task: Optional[asyncio.Task] = None
_retrain_lock = asyncio.Lock()

async def _retrain_loop():
    """Периодически подтягивает фичи из БД и переобучает модель."""
    assert model is not None
    while True:
        try:
            until = dt.datetime.now(dt.timezone.utc).isoformat()
            since = (dt.datetime.now(dt.timezone.utc) - timedelta(minutes=RETRAIN_LOOKBACK_MIN)).isoformat()
            async with _retrain_lock:
                res = model.train_from_db(since=since, until=until, limit=RETRAIN_DB_LIMIT)
            log.info(f"[AUTO-RETRAIN] {res}")
        except Exception as e:
            log.warning(f"[AUTO-RETRAIN] skipped: {e}")
        await asyncio.sleep(RETRAIN_INTERVAL_SEC)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, _retrain_task
    try:
        if os.path.exists(MODEL_PATH):
            model = IsoForestPerIP.load(MODEL_PATH)
            model.actions_path = ACTIONS_PATH
            log.info(f"Loaded model from {MODEL_PATH}")
        else:
            model = IsoForestPerIP(
                n_estimators=N_ESTIMATORS,
                contamination=CONTAMINATION,
                window_minutes=WINDOW_MINUTES,
                min_train_rows=MIN_TRAIN_ROWS,
                retrain_every_batches=RETRAIN_EVERY,
                hard_fail_ratio=HARD_FAIL_RATIO,
                hard_fail_min=HARD_FAIL_MIN,
                actions_path=ACTIONS_PATH,
                db_dsn=PG_DSN,
                db_schema=PG_SCHEMA,
                db_minconn=PG_MINCONN,
                db_maxconn=PG_MAXCONN,
            )
            log.info("Initialized fresh model")
    except Exception:
        log.exception("Failed to init model; creating fresh one")
        model = IsoForestPerIP(
            n_estimators=N_ESTIMATORS,
            contamination=CONTAMINATION,
            window_minutes=WINDOW_MINUTES,
            min_train_rows=MIN_TRAIN_ROWS,
            retrain_every_batches=RETRAIN_EVERY,
            hard_fail_ratio=HARD_FAIL_RATIO,
            hard_fail_min=HARD_FAIL_MIN,
            actions_path=ACTIONS_PATH,
            db_dsn=PG_DSN,
            db_schema=PG_SCHEMA,
            db_minconn=PG_MINCONN,
            db_maxconn=PG_MAXCONN,
        )

    if WARMUP_FROM_DB:
        try:
            warm = model.train_from_db(limit=RETRAIN_DB_LIMIT)
            log.info(f"[WARMUP] {warm}")
        except Exception as e:
            log.warning(f"[WARMUP] skipped: {e}")

    _retrain_task = asyncio.create_task(_retrain_loop())

    yield

    if _retrain_task:
        _retrain_task.cancel()
        try:
            await _retrain_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="IsoForestPerIP Scoring Service", version="1.1.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    assert model is not None
    return {"status": "ok", "trained": model._is_fitted, "actions_path": model.actions_path}

@app.post("/score")
def score_json(batch: EventsBatch = Body(...), write_actions: bool = True):
    assert model is not None
    events = batch.events
    if BATCH_TARGET and len(events) != BATCH_TARGET:
        log.warning(f"Batch size {len(events)} != target {BATCH_TARGET} (processing anyway)")
    try:
        old_path = model.actions_path
        if not write_actions:
            model.actions_path = os.devnull
        result = model.update_and_detect(events)
        model.actions_path = old_path

        if not result.get("trained"):
            try:
                quick = model.train_from_db(limit=RETRAIN_DB_LIMIT)
                log.info(f"[ON-DEMAND RETRAIN] {quick}")
            except Exception as e:
                log.warning(f"[ON-DEMAND RETRAIN] skipped: {e}")

    except Exception as e:
        log.exception("update_and_detect failed")
        raise HTTPException(status_code=500, detail=f"scoring failed: {e}")

    table = result.get("table", [])
    return JSONResponse({
        "total_events": result.get("total", len(events)),
        "trained": result.get("trained", False),
        "actions_written": result.get("actions_written", 0) if write_actions else 0,
        "top_table": table[:10],
    })

@app.post("/score-ndjson")
async def score_ndjson(req: Request, write_actions: bool = True):
    assert model is not None

    raw = await req.body()
    if req.headers.get("content-encoding", "").lower() == "gzip":
        try:
            raw = gzip.decompress(raw)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"gzip decompress failed: {e}")

    ctype = (req.headers.get("content-type") or "").split(";")[0].strip().lower()

    events: List[Dict[str, Any]] = []
    try:
        if ctype == "application/json":
            parsed = json.loads(raw.decode("utf-8"))
            if isinstance(parsed, dict) and "events" in parsed:
                events = parsed["events"]
            elif isinstance(parsed, list):
                events = parsed
            else:
                raise ValueError("application/json must be array or object with 'events'")
        else:
            for ln in raw.decode("utf-8").splitlines():
                ln = ln.strip()
                if not ln:
                    continue
                events.append(json.loads(ln))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid body: {e}")

    if not events:
        raise HTTPException(status_code=400, detail="no events")

    if BATCH_TARGET and len(events) != BATCH_TARGET:
        log.warning(f"Batch size {len(events)} != target {BATCH_TARGET} (processing anyway)")

    try:
        old_path = model.actions_path
        if not write_actions:
            model.actions_path = os.devnull
        result = model.update_and_detect(events)
        model.actions_path = old_path

        if not result.get("trained"):
            try:
                quick = model.train_from_db(limit=RETRAIN_DB_LIMIT)
                log.info(f"[ON-DEMAND RETRAIN] {quick}")
            except Exception as e:
                log.warning(f"[ON-DEMAND RETRAIN] skipped: {e}")

    except Exception as e:
        log.exception("update_and_detect failed")
        raise HTTPException(status_code=500, detail=f"scoring failed: {e}")

    table = result.get("table", [])
    return JSONResponse({
        "total_events": result.get("total", len(events)),
        "trained": result.get("trained", False),
        "actions_written": result.get("actions_written", 0) if write_actions else 0,
        "top_table": table[:10],
    })

@app.post("/cleanup")
def cleanup_old_data(keep_hours: int = 24):
    """Ручная очистка старых данных"""
    assert model is not None
    try:
        result = model.cleanup_old_data(keep_hours=keep_hours)
        return result
    except Exception as e:
        log.exception("cleanup failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/anomalies")
def get_anomalies(limit: int = 20):
    """Получить последние аномалии"""
    assert model is not None
    try:
        result = model.get_recent_anomalies(limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("get_anomalies failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/anomalies/{ip}")
def get_anomalies_by_ip(ip: str, limit: int = 50):
    """Получить аномалии для конкретного IP адреса"""
    assert model is not None
    try:
        result = model.get_anomalies_by_ip(ip=ip, limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("get_anomalies_by_ip failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/features/{ip}")
def get_features(ip: str, limit: int = 100):
    """Получить события (логи) для конкретного IP адреса"""
    assert model is not None
    try:
        result = model.get_events_by_ip(ip=ip, limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("get_features failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ips")
def list_ips(limit: int = 100):
    """Получить список IP адресов с краткой статистикой"""
    assert model is not None
    try:
        result = model.get_ips_summary(limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("list_ips failed")
        raise HTTPException(status_code=500, detail=str(e))

# Allow List endpoints
@app.get("/lists/allow")
def get_allow_list():
    """Получить список разрешенных IP/пользователей/сетей"""
    assert model is not None
    try:
        result = model.get_allow_list()
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("get_allow_list failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lists/allow")
def add_allow_item(item: ListItem):
    """Добавить элемент в список разрешений"""
    assert model is not None
    try:
        result = model.add_allow_item(
            item_type=item.type,
            value=item.value,
            description=item.description,
            expires_at=item.expires_at
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("add_allow_item failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/lists/allow")
def delete_allow_item(item: DeleteItem):
    """Удалить элемент из списка разрешений"""
    assert model is not None
    try:
        result = model.delete_allow_item(
            item_id=item.item_id,
            item_type=item.item_type,
            value=item.value
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("delete_allow_item failed")
        raise HTTPException(status_code=500, detail=str(e))

# Deny List endpoints
@app.get("/lists/deny")
def get_deny_list():
    """Получить список заблокированных IP/пользователей/сетей"""
    assert model is not None
    try:
        result = model.get_deny_list()
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("get_deny_list failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lists/deny")
def add_deny_item(item: ListItem):
    """Добавить элемент в список блокировок"""
    assert model is not None
    try:
        result = model.add_deny_item(
            item_type=item.type,
            value=item.value,
            description=item.description,
            expires_at=item.expires_at
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("add_deny_item failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/lists/deny")
def delete_deny_item(item: DeleteItem):
    """Удалить элемент из списка блокировок"""
    assert model is not None
    try:
        result = model.delete_deny_item(
            item_id=item.item_id,
            item_type=item.item_type,
            value=item.value
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("delete_deny_item failed")
        raise HTTPException(status_code=500, detail=str(e))

# Suppress endpoint
@app.post("/suppress")
def suppress_alerts(item: SuppressItem):
    """Временно подавить оповещения по IP/пользователю/паттерну"""
    assert model is not None
    try:
        result = model.add_suppress_item(
            item_type=item.type,
            value=item.value,
            minutes=item.minutes,
            description=item.description
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        log.exception("suppress_alerts failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/actions.ndjson")
def export_actions_ndjson(since: str = None, until: str = None, limit: int = 10000):
    """Экспорт аномалий в формате NDJSON для SIEM"""
    assert model is not None
    try:
        result = model.export_actions_ndjson(since=since, until=until, limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Возвращаем NDJSON как plain text
        return JSONResponse(
            content=result["ndjson"],
            media_type="application/x-ndjson",
            headers={
                "Content-Disposition": f"attachment; filename=anomalies_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.ndjson",
                "X-Total-Count": str(result["count"]),
                "X-Since": since or "",
                "X-Until": until or "",
                "X-Limit": str(limit)
            }
        )
    except Exception as e:
        log.exception("export_actions_ndjson failed")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=bool(int(os.getenv("RELOAD", "0"))),
    )
