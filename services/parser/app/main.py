from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import time, uuid

app = FastAPI(title="parser", version="0.1")

EVENTS = []
INCIDENTS = {}
BLOCKLIST = set()

class Event(BaseModel):
    timestamp: str
    event_id: str
    src_ip: str
    dst_ip: str | None = None
    dst_port: int | None = None
    service: str | None = None
    severity: str | None = None
    message: str | None = None
    origin: str | None = None

@app.get("/healthz")
async def health():
    return {"status": "ok"}

@app.post("/ingest")
async def ingest(batch: List[Event]):
    for e in batch:
        rec = e.dict()
        rec["blocked"] = rec["src_ip"] in BLOCKLIST
        EVENTS.append(rec)
        # простое правило: если в message есть "Failed" -> инцидент
        if "Failed" in (rec.get("message") or ""):
            ip = rec["src_ip"]
            INCIDENTS.setdefault(ip, {"ip": ip, "events": [], "status": "open", "created": time.time()})["events"].append(rec)
    return {"received": len(batch)}

@app.get("/incidents")
async def get_incidents():
    return {"incidents": list(INCIDENTS.values())}

@app.post("/simulate_block")
async def simulate_block(payload: dict):
    ip = payload.get("ip")
    actor = payload.get("actor", "demo_user")
    if not ip:
        raise HTTPException(status_code=400, detail="no ip")
    BLOCKLIST.add(ip)
    if ip in INCIDENTS:
        INCIDENTS[ip]["status"] = "mitigated"
        INCIDENTS[ip].setdefault("actions",[]).append({"action":"simulate_block","by":actor,"ts":time.time()})
    # добавить событие-лог действия
    EVENTS.append({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event_id": str(uuid.uuid4()),
        "src_ip": ip,
        "message": f"Action: block simulated for {ip} by {actor}",
        "service": "controller",
        "severity": "info",
        "blocked": True
    })
    return {"result": "simulated", "ip": ip}
