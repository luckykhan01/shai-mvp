#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, json, uuid
from typing import List, Optional, Union
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# берём функцию detect_and_parse из parser_normalizer.py
from parser_normalizer import detect_and_parse

# куда писать нормализованные события
OUT_FILE = os.environ.get("OUT_FILE", "normalized.jsonl")

app = FastAPI(title="Log Receiver & Normalizer (to file)", version="1.0.0")

class IngestPayload(BaseModel):
    line: Optional[str] = None
    lines: Optional[List[str]] = None

@app.get("/health")
async def health():
    return {"status": "ok", "out_file": OUT_FILE}

@app.post("/ingest", response_class=JSONResponse)
async def ingest(payload: Union[IngestPayload, None] = None, request: Request = None):
    """
    Принимает:
    - text/plain: просто строки логов (\n-разделённые)
    - application/json: {"line": "..."} или {"lines": ["...","..."]}
    Парсит и сохраняет в OUT_FILE (JSONL).
    """
    raw_lines: List[str] = []

    # если text/plain
    if request and request.headers.get("content-type","").startswith("text/plain"):
        body = await request.body()
        text = body.decode("utf-8", errors="ignore")
        raw_lines = [l for l in text.splitlines() if l.strip()]
    else:
        # json
        try:
            data = payload.dict() if payload else {}
        except Exception:
            data = await request.json()
        if data.get("line"):
            raw_lines = [data["line"]]
        elif data.get("lines"):
            raw_lines = [l for l in data["lines"] if l.strip()]
        else:
            raise HTTPException(status_code=400, detail="Need 'line' or 'lines'")

    normalized, errors = [], []
    for l in raw_lines:
        ok, obj = detect_and_parse(l)
        (normalized if ok else errors).append(obj)

    # append в файл
    if normalized:
        with open(OUT_FILE, "a", encoding="utf-8") as f:
            for obj in normalized:
                f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    return {
        "received": len(raw_lines),
        "saved": len(normalized),
        "errors": len(errors),
        "sample": normalized[:2],
        "errors_sample": errors[:2],
        "out_file": OUT_FILE
    }
