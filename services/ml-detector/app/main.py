#!/usr/bin/env python3
# server.py
from __future__ import annotations
import os, json, gzip, logging, asyncio
import datetime as dt
from datetime import timedelta
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Body, Request
from pydantic import BaseModel, conlist
from starlette.responses import JSONResponse

from mlmodel import (IsoForestPerIP)

# -------- CONFIG --------
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

# --- добавлено: конфиг автопереобучения ---
RETRAIN_INTERVAL_SEC = int(os.getenv("RETRAIN_INTERVAL_SEC", "300"))   # каждые 5 минут
RETRAIN_LOOKBACK_MIN = int(os.getenv("RETRAIN_LOOKBACK_MIN", "60"))    # окно выборки из БД (последний час)
RETRAIN_DB_LIMIT     = int(os.getenv("RETRAIN_DB_LIMIT", "20000"))     # ограничение строк из БД
WARMUP_FROM_DB       = int(os.getenv("WARMUP_FROM_DB", "1"))           # подогреться из БД на старте

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("serve_isoforest")

# -------- SCHEMAS (JSON вариант) --------
class EventsBatch(BaseModel):
    events: conlist(Dict[str, Any], min_length=1)

# -------- APP + MODEL (lifespan) --------
model: Optional[IsoForestPerIP] = None

# --- добавлено: фоновые объекты для переобучения ---
_retrain_task: Optional[asyncio.Task] = None
_retrain_lock = asyncio.Lock()

async def _retrain_loop():
    """Периодически подтягивает фичи из БД и переобучает модель."""
    assert model is not None
    while True:
        try:
            # окно за последние RETRAIN_LOOKBACK_MIN минут
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
        )

    # --- добавлено: тёплый старт из БД (если реализован train_from_db и включен флагом) ---
    if WARMUP_FROM_DB:
        try:
            warm = model.train_from_db(limit=RETRAIN_DB_LIMIT)
            log.info(f"[WARMUP] {warm}")
        except Exception as e:
            log.warning(f"[WARMUP] skipped: {e}")

    # --- добавлено: старт фонового цикла автопереобучения ---
    _retrain_task = asyncio.create_task(_retrain_loop())

    yield

    # --- добавлено: аккуратная остановка фоновой задачи ---
    if _retrain_task:
        _retrain_task.cancel()
        try:
            await _retrain_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="IsoForestPerIP Scoring Service", version="1.1.0", lifespan=lifespan)

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
        # временно можно отключить запись экшенов из запроса
        old_path = model.actions_path
        if not write_actions:
            model.actions_path = os.devnull
        result = model.update_and_detect(events)
        model.actions_path = old_path

        # --- добавлено: если ещё не обучены — попробовать быстро подучиться из БД на лету ---
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

# ---------- NDJSON вариант: raw body (по строкам), понимает gzip
@app.post("/score-ndjson")
async def score_ndjson(req: Request, write_actions: bool = True):
    assert model is not None

    # прочитаем тело и раскодируем при необходимости
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
            # application/x-ndjson | text/plain | неизвестно -> парсим построчно
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

        # --- добавлено: on-demand retrain если нужно
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

# -------- local run --------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=bool(int(os.getenv("RELOAD", "0"))),
    )
