from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="ml-detector", version="0.1")

class Ev(BaseModel):
    src_ip: str
    message: str

@app.get("/healthz")
async def health():
    return {"status": "ok"}

@app.post("/detect")
async def detect(events: List[Ev]):
    results = []
    for e in events:
        score = 0.9 if "Failed" in e.message else 0.01
        results.append({"src_ip": e.src_ip, "score": score})
    return {"results": results}
