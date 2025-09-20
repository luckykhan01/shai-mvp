import requests, time, random, uuid
from datetime import datetime
import os

PARSER = os.environ.get("PARSER_URL", "http://parser:8000/ingest")
RATE = float(os.environ.get("RATE", "5"))  # events/sec
BATCH = int(os.environ.get("BATCH", "5"))

USERS = ["alice","bob","carol","dave","service"]
SERVICES = ["ssh","nginx","postgres","redis","cron"]

def random_ip():
    return f"{random.randint(13,250)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def make_event():
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "event_id": str(uuid.uuid4()),
        "src_ip": random_ip(),
        "dst_ip": "10.0.0.1",
        "dst_port": random.choice([22,80,443,5432]),
        "service": random.choice(SERVICES),
        "severity": random.choice(["info","warning","critical"]),
        "message": random.choice(["User logged in", "Failed password for user", "Connection opened", "Config changed"]),
        "origin": "sim"
    }

def run():
    interval = max(0.01, 1.0 / RATE)
    while True:
        batch = [make_event() for _ in range(BATCH)]
        try:
            requests.post(PARSER, json=batch, timeout=5)
        except Exception as e:
            print("Send error:", e)
        time.sleep(interval * BATCH)

if __name__ == "__main__":
    print("Starting generator ->", PARSER, "rate:", RATE, "batch:", BATCH)
    run()
