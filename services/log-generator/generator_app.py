from __future__ import annotations
import argparse
import random
import sys
import time
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import requests

INGEST_URL_DEFAULT = os.environ.get("INGEST_URL", "http://localhost:8000/ingest")

SERVICES = [
    "billing-service", "auth-service", "orders-service",
    "search-service", "payments-service", "inventory-service",
    "notification-service", "gateway"
]

COMPONENTS = [
    "OrderProcessor", "AuthFilter", "DBClient",
    "KafkaConsumer", "HttpClient", "PaymentGateway",
    "CacheManager", "Scheduler"
]

LEVELS = ["INFO", "WARN", "ERROR"]

MESSAGES_NORMAL = [
    "Processed order id=##ORDER## in 23ms",
    "User login successful user_id=##USER##",
    "Cache hit for key=product:##SKU##",
    "Health check OK",
    "Scheduled job completed job_id=##JOB##",
]

MESSAGES_WARN = [
    "Slow query detected took 1200ms",
    "Retrying external call to payment gateway",
    "Cache miss for key=product:##SKU##",
]

MESSAGES_ERROR = [
    "NullPointerException at line ##LINE##",
    "TimeoutError: request to downstream service exceeded 10s",
    "DatabaseConnectionError: could not connect after 3 attempts",
    "ValueError: invalid value for field 'price'",
    "IndexError: list index out of range",
]

SUSPICIOUS_STACKSNIPPETS = [
    "at com.example.hack.EvilClass.method(EvilClass.java:13)",
    "Unauthorized access attempt with token 'eyJhbGciOiJI...'",
    "payload contains suspicious payload: <script>evil()</script>",
    "Unexpected binary blob: 0xDEADBEEFCAFEBABE",
]

def ts_now():
    dt = datetime.now()
    ms = int(dt.microsecond / 1000)
    return dt.strftime("%Y-%m-%d %H:%M:%S") + f",{ms:03d}"

def fill_template(t: str):
    return (t.replace("##ORDER##", str(random.randint(1000,9999)))
             .replace("##USER##", str(random.randint(10000,99999)))
             .replace("##SKU##", str(random.randint(100000,999999)))
             .replace("##JOB##", str(random.randint(1,999)))
             .replace("##LINE##", str(random.randint(10,999)))
            )

def format_line(ts: str, level: str, service: str, component: str, message: str) -> str:
    return f"{ts} {level} {service} {component} - {message}"

def gen_normal(service: str|None = None) -> str:
    svc = service or random.choice(SERVICES)
    comp = random.choice(COMPONENTS)
    p = random.random()
    if p < 0.75:
        msg = fill_template(random.choice(MESSAGES_NORMAL))
        lvl = "INFO"
    elif p < 0.9:
        msg = fill_template(random.choice(MESSAGES_WARN))
        lvl = "WARN"
    else:
        msg = fill_template(random.choice(MESSAGES_ERROR))
        lvl = "ERROR"
    return format_line(ts_now(), lvl, svc, comp, msg)

def gen_error_flood(service: str|None = None, burst_size: int = 10) -> List[str]:
    svc = service or random.choice(SERVICES)
    comp = random.choice(COMPONENTS)
    lines = []
    for _ in range(burst_size):
        msg = fill_template(random.choice(MESSAGES_ERROR))
        if random.random() < 0.4:
            msg = msg + " | " + random.choice(SUSPICIOUS_STACKSNIPPETS)
        lines.append(format_line(ts_now(), "ERROR", svc, comp, msg))
        time.sleep(0.001)  
    return lines

def gen_unusual_exception(service: str|None = None) -> str:
    svc = service or random.choice(SERVICES)
    comp = random.choice(COMPONENTS)
    top = fill_template(random.choice(MESSAGES_ERROR))
    stack_lines = [random.choice(SUSPICIOUS_STACKSNIPPETS) for _ in range(random.randint(1,4))]
    msg = top + "\n    " + "\n    ".join(stack_lines)
    return format_line(ts_now(), "ERROR", svc, comp, msg)

def gen_timeout(service: str|None = None) -> str:
    svc = service or random.choice(SERVICES)
    comp = random.choice(COMPONENTS)
    msg = "TimeoutError: request to downstream service exceeded {}s".format(random.choice([5,10,15,30]))
    return format_line(ts_now(), "WARN", svc, comp, msg)

def gen_svc_down(service: str|None = None) -> List[str]:
    svc = service or random.choice(SERVICES)
    comp = random.choice(COMPONENTS)
    seq = []
    seq.append(format_line(ts_now(), "WARN", svc, comp, "High error rate detected"))
    seq.append(format_line(ts_now(), "ERROR", svc, comp, "Rejecting requests due to full thread pool"))
    seq.append(format_line(ts_now(), "ERROR", svc, comp, "OutOfMemoryError: Java heap space"))
    if random.random() < 0.5:
        seq.append(format_line(ts_now(), "INFO", svc, comp, "Service recovered after restart"))
    return seq

SCENARIOS = {
    "normal": gen_normal,
    "error_flood": gen_error_flood,
    "unusual_exception": gen_unusual_exception,
    "timeout": gen_timeout,
    "svc_down": gen_svc_down,
}

def send_to_parser(line: str, ingest_url: str, save: bool, timeout: float = 2.0):
    payload = {"line": line, "save": save}
    try:
        requests.post(ingest_url, json=payload, timeout=timeout)
    except Exception:
        pass

def run_once(scenario: str, count: int, rate: float, service: Optional[str],
             save_flag: bool, out_path: Optional[str], ingest_url: str):
    outfh = sys.stdout if not out_path else open(out_path, "a", encoding="utf-8")
    try:
        generated = 0
        while generated < count:
            gen = SCENARIOS[scenario]
            item = gen(service)
            items = item if isinstance(item, list) else [item]
            for line in items:
                outfh.write(line + "\n")
                outfh.flush()
                send_to_parser(line, ingest_url, save_flag)
                generated += 1
                if generated >= count:
                    break
                if rate and rate > 0:
                    time.sleep(1.0 / float(rate))
    finally:
        if outfh is not sys.stdout:
            outfh.close()

def run_loop(scenario: str, rate: float, service: Optional[str],
             save_flag: bool, out_path: Optional[str], ingest_url: str):
    outfh = sys.stdout if not out_path else open(out_path, "a", encoding="utf-8")
    try:
        while True:
            gen = SCENARIOS[scenario]
            item = gen(service)
            items = item if isinstance(item, list) else [item]
            for line in items:
                outfh.write(line + "\n")
                outfh.flush()
                send_to_parser(line, ingest_url, save_flag)
                if rate and rate > 0:
                    time.sleep(1.0 / float(rate))
    except KeyboardInterrupt:
        print("Interrupted by user")
    finally:
        if outfh is not sys.stdout:
            outfh.close()

def main():
    ap = argparse.ArgumentParser(description="Application log generator that POSTs to a parser /ingest endpoint")
    ap.add_argument("--scenario", choices=list(SCENARIOS.keys()), default="normal")
    ap.add_argument("--count", type=int, default=100, help="Number of lines to generate (ignored if --loop)")
    ap.add_argument("--rate", type=float, default=0.0, help="Lines per second (0 = as fast as possible)")
    ap.add_argument("--service", type=str, default="", help="Force service name")
    ap.add_argument("--out", type=str, default="", help="Optional path to also write raw lines (append)")
    ap.add_argument("--save", action="store_true", help="Ask parser to persist normalized JSON")
    ap.add_argument("--ingest", type=str, default=INGEST_URL_DEFAULT, help="Parser ingest URL")
    ap.add_argument("--loop", action="store_true", help="Send indefinitely until Ctrl+C")
    args = ap.parse_args()

    svc = args.service or None
    if args.loop:
        run_loop(args.scenario, args.rate, svc, args.save, args.out or None, args.ingest)
    else:
        run_once(args.scenario, args.count, args.rate, svc, args.save, args.out or None, args.ingest)

if __name__ == "__main__":
    main()
