import argparse
import random
import sys
import time
import os
from datetime import datetime
from pathlib import Path
import requests

INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:8000/ingest")

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
HOSTS = ["server1","server2","bastion1","edge-ssh","auth-gw"]
USERS = ["root","admin","ubuntu","devops","postgres","elastic","guest"]
SUSPICIOUS_USERS = ["root","admin","guest"]

def rand_public_ip():
    while True:
        a, b, c, d = [random.randint(1, 255) for _ in range(4)]
        if a == 10: continue
        if a == 172 and 16 <= b <= 31: continue
        if a == 192 and b == 168: continue
        if a >= 224: continue
        return f"{a}.{b}.{c}.{d}"

def syslog_ts(now=None):
    dt = now or datetime.now()
    return f"{MONTHS[dt.month-1]} {dt.day:>2} {dt.strftime('%H:%M:%S')}"

def line_failed(user, src_ip, dport=22, pid=None, host=None):
    pid = pid or random.randint(100, 9999)
    host = host or random.choice(HOSTS)
    sport = random.randint(1024, 65535)
    return f"{syslog_ts()} {host} sshd[{pid}]: Failed password for {user} from {src_ip} port {sport} ssh2"

def line_accepted(user, src_ip, dport=22, pid=None, host=None):
    pid = pid or random.randint(100, 9999)
    host = host or random.choice(HOSTS)
    sport = random.randint(1024, 65535)
    return f"{syslog_ts()} {host} sshd[{pid}]: Accepted password for {user} from {src_ip} port {sport} ssh2"

def line_invalid_user(user, src_ip, pid=None, host=None):
    pid = pid or random.randint(100, 9999)
    host = host or random.choice(HOSTS)
    sport = random.randint(1024, 65535)
    return f"{syslog_ts()} {host} sshd[{pid}]: Failed password for invalid user {user} from {src_ip} port {sport} ssh2"

def gen_normal():
    if random.random() < 0.75:
        return line_accepted(random.choice(USERS), rand_public_ip())
    else:
        if random.random() < 0.5:
            return line_failed(random.choice(USERS), rand_public_ip())
        else:
            return line_invalid_user("test"+str(random.randint(1,999)), rand_public_ip())

def gen_brute(src_ip=None, user=None):
    attacker = src_ip or rand_public_ip()
    target_user = user or random.choice(SUSPICIOUS_USERS)
    if random.random() < 0.85:
        return line_failed(target_user, attacker)
    else:
        return line_accepted(target_user, attacker)

def gen_success_after_fail(src_ip=None, user=None, fail_ratio=0.6):
    src = src_ip or rand_public_ip()
    u = user or random.choice(USERS)
    return line_failed(u, src) if random.random() < fail_ratio else line_accepted(u, src)

SCEN_MAP = {
    "normal": lambda src_ip, user: gen_normal(),
    "brute": lambda src_ip, user: gen_brute(src_ip, user),
    "success_after_fail": lambda src_ip, user: gen_success_after_fail(src_ip, user),
    "suspicious_users": lambda src_ip, user: (line_failed if random.random()<0.6 else line_accepted)(
        random.choice(SUSPICIOUS_USERS), rand_public_ip()
    ),
}

def send(line: str, save: bool):
    try:
        requests.post(INGEST_URL, json={"line": line, "save": save}, timeout=2.0)
    except Exception:
        pass

def run_once(scenario: str, count: int, rate: float, user: str | None, src: str | None,
             save_flag: bool, out_path: str | None):
    gen = SCEN_MAP[scenario]
    outfh = sys.stdout if not out_path or out_path == "-" else open(out_path, "a", encoding="utf-8")
    try:
        for _ in range(count):
            line = gen(src, user)
            outfh.write(line + "\n")
            outfh.flush()
            send(line, save_flag)
            if rate and rate > 0:
                time.sleep(1.0 / float(rate))
    finally:
        if outfh is not sys.stdout:
            outfh.close()

def run_loop(scenario: str, rate: float, user: str | None, src: str | None,
             save_flag: bool, out_path: str | None):
    gen = SCEN_MAP[scenario]
    outfh = sys.stdout if not out_path or out_path == "-" else open(out_path, "a", encoding="utf-8")
    try:
        while True:
            line = gen(src, user)
            outfh.write(line + "\n")
            outfh.flush()
            send(line, save_flag)
            if rate and rate > 0:
                time.sleep(1.0 / float(rate))
    except KeyboardInterrupt:
        pass
    finally:
        if outfh is not sys.stdout:
            outfh.close()

def main():
    ap = argparse.ArgumentParser(description="Simple SSHD log generator that POSTs to http://localhost:8000/ingest")
    ap.add_argument("--scenario", choices=["normal","brute","success_after_fail","suspicious_users"], default="normal")
    ap.add_argument("--count", type=int, default=100, help="Number of lines to generate (ignored in --loop)")
    ap.add_argument("--rate", type=float, default=0.0, help="Lines per second (0 = as fast as possible)")
    ap.add_argument("--user", type=str, default="", help="Force username (for brute/success_after_fail)")
    ap.add_argument("--src", type=str, default="", help="Force attacker IP (for brute/success_after_fail)")
    ap.add_argument("--out", type=str, default="", help="Optional path to also write raw lines (append mode)")
    ap.add_argument("--save", action="store_true", help="Ask parser to persist normalized JSON")
    ap.add_argument("--loop", action="store_true", help="Send indefinitely until Ctrl+C")
    args = ap.parse_args()

    user = args.user or None
    src = args.src or None
    if args.loop:
        run_loop(args.scenario, args.rate, user, src, args.save, args.out or None)
    else:
        run_once(args.scenario, args.count, args.rate, user, src, args.save, args.out or None)

if __name__ == "__main__":
    main()
