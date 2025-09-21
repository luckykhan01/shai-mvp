# services/parser/app/main.py
import os, json
from typing import List, Optional, Union
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from parser_normalizer import detect_and_parse
from rules import RuleEngine  # <--- добавили

OUT_FILE = os.environ.get("OUT_FILE", "/app/data/normalized.jsonl")
INC_FILE = os.environ.get("INC_FILE", "/app/data/incidents.jsonl")   # <--- добавили

app = FastAPI(title="Log Receiver & Normalizer", version="1.2.0")
rule_engine = RuleEngine(max_keep=1000)  # <--- добавили

class IngestPayload(BaseModel):
    line: Optional[str] = None
    lines: Optional[List[str]] = None

@app.get("/health")
async def health():
    return {"status": "ok", "out_file": OUT_FILE, "inc_file": INC_FILE, "incidents_in_mem": len(rule_engine.recent_incidents)}

@app.get("/healthz")
async def healthz():
    return await health()

@app.get("/incidents", response_class=JSONResponse)  # <--- добавили
async def get_incidents(limit: int = 100):
    items = list(rule_engine.recent_incidents)[-abs(limit):]
    return {"count": len(items), "items": items}

@app.post("/ingest", response_class=JSONResponse)
async def ingest(payload: Union[IngestPayload, None] = None, request: Request = None):
    raw_lines: List[str] = []

    if request and (request.headers.get("content-type", "").startswith("text/plain")):
        text = (await request.body()).decode("utf-8", errors="ignore")
        raw_lines = [l for l in text.splitlines() if l.strip()]
    else:
        data = {}
        if payload:
            data = payload.dict()
        elif request:
            try:
                data = await request.json()
            except Exception:
                pass
        if data.get("line"):
            raw_lines = [data["line"]]
        elif data.get("lines"):
            raw_lines = [l for l in data["lines"] if l.strip()]
        else:
            raise HTTPException(status_code=400, detail="Need 'line' or 'lines'")

    normalized, errors, new_alerts = [], [], []
    for l in raw_lines:
        ok, obj = detect_and_parse(l)
        if ok:
            normalized.append(obj)
            # правила – мгновенно
            alerts = rule_engine.process(obj)
            if alerts:
                new_alerts.extend(alerts)
        else:
            errors.append(obj)

    if normalized:
        os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
        with open(OUT_FILE, "a", encoding="utf-8") as f:
            for obj in normalized:
                f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    if new_alerts:
        os.makedirs(os.path.dirname(INC_FILE), exist_ok=True)
        with open(INC_FILE, "a", encoding="utf-8") as f:
            for inc in new_alerts:
                f.write(json.dumps(inc, ensure_ascii=False) + "\n")

    return {
        "received": len(raw_lines),
        "saved": len(normalized),
        "errors": len(errors),
        "alerts": len(new_alerts),
        "sample": normalized[:2],
        "errors_sample": errors[:2],
        "out_file": OUT_FILE,
        "inc_file": INC_FILE
    }
