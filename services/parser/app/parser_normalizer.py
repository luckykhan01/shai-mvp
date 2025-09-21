#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, uuid, json
from datetime import datetime, timezone
import logging

# ---------- REGEX-паттерны ----------
# 1) AUTH/SYSLOG (sshd):
# Sep 20 12:01:33 server1 sshd[1234]: Failed password for root from 185.23.54.11 port 54321 ssh2
AUTH_RE = re.compile(
    r'^(?P<mon>[A-Z][a-z]{2})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+'
    r'(?P<host>\S+)\s+sshd\[\d+\]:\s+'
    r'(?P<verb>Failed|Accepted)\s+password\s+for\s+(?P<user>\S+)\s+from\s+'
    r'(?P<src_ip>\d{1,3}(?:\.\d{1,3}){3})\s+port\s+(?P<src_port>\d+)\s+ssh2'
)

# 2) FIREWALL/IDS:
# 2025-09-20T12:02:10Z firewall: DENY TCP 185.23.54.11:443 -> 10.0.0.5:22
FW_RE = re.compile(
    r'^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+firewall:\s+'
    r'(?P<action>ALLOW|DENY)\s+(?P<proto>[A-Z]+)\s+'
    r'(?P<src_ip>\d{1,3}(?:\.\d{1,3}){3}):(?P<src_port>\d+)\s+->\s+'
    r'(?P<dst_ip>\d{1,3}(?:\.\d{1,3}){3}):(?P<dst_port>\d+)'
)

# 3) APP/SERVICE:
# 2025-09-20 12:03:55,101 ERROR billing-service OrderProcessor - NullPointerException at line 123
APP_RE = re.compile(
    r'^(?P<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+'
    r'(?P<level>ERROR|WARN|INFO|DEBUG)\s+'
    r'(?P<service>[A-Za-z0-9_\-]+)\s+'
    r'(?P<component>[A-Za-z0-9_\-]+)\s+-\s+'
    r'(?P<message>.*)$'
)

MONTHS = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

def _iso_ts_from_syslog(mon: str, day: str, hhmmss: str) -> str:
    """'Sep 20 12:01:33' -> ISO-8601 UTC (берём текущий год)."""
    year = datetime.now(timezone.utc).year
    try:
        dt = datetime(year, MONTHS[mon], int(day),
                      int(hhmmss[0:2]), int(hhmmss[3:5]), int(hhmmss[6:8]),
                      tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()

def _mask_secrets(text: str) -> str:
    """Маскирование возможных секретов в message (на всякий)."""
    if not text:
        return text
    text = re.sub(r'(password|passwd|pwd)\s*=\s*\S+', r'\1=***', text, flags=re.I)
    text = re.sub(r'(api[_-]?key|token|secret)\s*=\s*[A-Za-z0-9_\-]{6,}', r'\1=***', text, flags=re.I)
    return text

def detect_and_parse(line: str):
    """
    Возвращает кортеж (ok: bool, obj: dict).
    ok=True -> obj = нормализованное событие
    ok=False -> obj = {"error":"unrecognized_format","raw":...}
    """
    line = (line or "").rstrip("\n")

    # AUTH
    m = AUTH_RE.match(line)
    if m:
        logging.info("Auth")
        print("auth")
        d = m.groupdict()
        ts = _iso_ts_from_syslog(d['mon'], d['day'], d['time'])
        outcome = 'failed' if d['verb'] == 'Failed' else 'success'
        return True, {
            "event_id": str(uuid.uuid4()),
            "ts": ts,
            "source_ip": d['src_ip'],
            "source_port": int(d['src_port']),
            "dest_ip": None,
            "dest_port": 22,
            "user": d['user'],
            "service": "auth-service",
            "sensor": "syslog",
            "event_type": "auth",
            "action": "login",
            "outcome": outcome,
            "message": _mask_secrets(line),
            "protocol": "ssh",
            "bytes": None,
            "scenario": None,
            "metadata": {}
        }

    # FIREWALL
    m = FW_RE.match(line)
    if m:
        logging.info("fw")
        print("fw")
        d = m.groupdict()
        action = d['action'].lower()         # allow|deny
        outcome = 'success' if action == 'allow' else 'blocked'
        return True, {
            "event_id": str(uuid.uuid4()),
            "ts": d['ts'],
            "source_ip": d['src_ip'],
            "source_port": int(d['src_port']),
            "dest_ip": d['dst_ip'],
            "dest_port": int(d['dst_port']),
            "user": None,
            "service": "firewall",
            "sensor": "firewall",
            "event_type": "network",
            "action": action,
            "outcome": outcome,
            "message": _mask_secrets(line),
            "protocol": d['proto'].lower(),  # tcp/udp/…
            "bytes": None,
            "scenario": None,
            "metadata": {}
        }

    # APP
    m = APP_RE.match(line)
    if m:
        logging.info("app")
        d = m.groupdict()
        try:
            ts_iso = datetime.strptime(d['ts'], "%Y-%m-%d %H:%M:%S,%f").replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            ts_iso = datetime.now(timezone.utc).isoformat()
        return True, {
            "event_id": str(uuid.uuid4()),
            "ts": ts_iso,
            "source_ip": None,
            "source_port": None,
            "dest_ip": None,
            "dest_port": None,
            "user": None,
            "service": d['service'],
            "sensor": "app",
            "event_type": "app_error" if d['level'] == 'ERROR' else "app_log",
            "action": "exception" if d['level'] == 'ERROR' else d['level'].lower(),
            "outcome": "error" if d['level'] == 'ERROR' else "info",
            "message": _mask_secrets(d['message']),
            "protocol": None,
            "bytes": None,
            "scenario": None,
            "metadata": {"component": d['component'], "level": d['level']}
        }

    # UNKNOWN
    return False, {"error": "unrecognized_format", "raw": line}

# --- опциональн
# о: быстрый CLI ---
if __name__ == "__main__":
    import sys
    for raw in sys.stdin:
        ok, obj = detect_and_parse(raw)
        print(json.dumps(obj, ensure_ascii=False))
