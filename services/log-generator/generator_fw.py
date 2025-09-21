#!/usr/bin/env python3
import argparse, random, sys, time, os
from datetime import datetime, timezone
import requests

INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:8000/ingest")
ACTIONS = ["ALLOW", "DENY"]
PROTOS = ["TCP", "UDP"]
FW_NAMES = ["firewall"]
INTERNALS = ["10.0.0.", "10.0.1.", "192.168.1."]

DEFAULT_BAD_IPS = ["185.23.54.11", "45.12.33.7", "103.9.12.1", "5.188.87.10"]


def ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def rand_pub_ip():
    return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def rand_int_ip():
    base = random.choice(INTERNALS)
    return f"{base}{random.randint(2, 254)}"


def rand_port():
    if random.random() < 0.7:
        return random.choice([22, 23, 53, 80, 443, 445, 3389, 8080, 9200])
    return random.randint(1024, 65535)


def line_fw(ts_str, fw, action, proto, src, spt, dst, dpt, note=""):
    return f"{ts_str} {fw}: {action} {proto} {src}:{spt} -> {dst}:{dpt} {note}".strip()


def gen_normal(n):
    out = []
    for _ in range(n):
        fw = random.choice(FW_NAMES)
        action = "ALLOW" if random.random() < 0.7 else "DENY"
        proto = random.choice(PROTOS)
        src = rand_pub_ip()
        dst = rand_int_ip()
        spt = random.randint(1024, 65535)
        dpt = rand_port()
        out.append(line_fw(ts(), fw, action, proto, src, spt, dst, dpt))
    return out


def gen_bad_ip(n, bad_ips=None):
    out = []
    fw = random.choice(FW_NAMES)
    bads = bad_ips or DEFAULT_BAD_IPS
    for _ in range(n):
        src = random.choice(bads)
        dst = rand_int_ip()
        spt = random.randint(1024, 65535)
        dpt = rand_port()
        out.append(line_fw(ts(), fw, "DENY", random.choice(PROTOS), src, spt, dst, dpt, "BLACKLIST"))
    return out


def gen_scan(n, attacker=None, target=None):
    out = []
    fw = random.choice(FW_NAMES)
    src = attacker or rand_pub_ip()
    dst = target or rand_int_ip()
    for _ in range(n):
        spt = random.randint(1024, 65535)
        dpt = rand_port()
        action = "DENY" if random.random() < 0.6 else "ALLOW"
        out.append(line_fw(ts(), fw, action, random.choice(PROTOS), src, spt, dst, dpt, "PORT_SCAN"))
    return out


def send_event(event: dict, save: bool = True, timeout: float = 2.0):
    """
    Send event dict to INGEST_URL as JSON.
    The receiver expects either {"line": "..."} or raw text; here we send JSON with "line".
    `event` should be a dict, e.g. {"line": "<log line>"}
    """
    payload = {**event, "_save": save}
    try:
        r = requests.post(INGEST_URL, json=payload, timeout=timeout)
        r.raise_for_status()
        # optionally parse/print response for debugging:
        # print("sent OK:", r.json())
        return True
    except requests.exceptions.RequestException as e:
        # minimal error output; replace with logging if desired
        print(f"[send_event] failed to send (url={INGEST_URL}): {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[send_event] unexpected error: {e}", file=sys.stderr)
        return False



def main():
    ap = argparse.ArgumentParser(description="Firewall log generator")
    ap.add_argument("--scenario", choices=["normal", "bad_ip", "scan"], default="normal")
    ap.add_argument("--count", type=int, default=100)
    ap.add_argument("--attacker-ip", type=str, default="")
    ap.add_argument("--target-ip", type=str, default="")
    ap.add_argument("--bad-ips-file", type=str, default="")
    ap.add_argument("--out", type=str, default="-")
    ap.add_argument("--realtime", action="store_true")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--nosend", action="store_true", help="Do not send events over HTTP; only write to file/stdout")
    ap.add_argument("--save", action="store_true", help="Set _save flag to True in payload (default False if not set)")
    args = ap.parse_args()
    random.seed(args.seed)

    bad_ips = None
    if args.bad_ips_file:
        try:
            with open(args.bad_ips_file, "r") as fh:
                bad_ips = [ln.strip() for ln in fh if ln.strip()]
        except Exception:
            bad_ips = None

    if args.scenario == "normal":
        lines = gen_normal(args.count)
    elif args.scenario == "bad_ip":
        lines = gen_bad_ip(args.count, bad_ips)
    else:
        lines = gen_scan(args.count, attacker=args.attacker_ip or None, target=args.target_ip or None)

    fh = sys.stdout if args.out == "-" else open(args.out, "w", encoding="utf-8")
    try:
        if args.realtime:
            # Infinite loop for realtime mode
            while True:
                # Generate one event at a time
                if args.scenario == "normal":
                    ln = gen_normal(1)[0]
                elif args.scenario == "bad_ip":
                    ln = gen_bad_ip(1, bad_ips=bad_ips)[0]
                elif args.scenario == "scan":
                    ln = gen_scan(1, attacker=args.attacker_ip or None, target=args.target_ip or None)[0]
                
                # write to file/stdout
                fh.write(ln + "\n")
                fh.flush()

                # send over HTTP unless --nosend provided
                if not args.nosend:
                    payload = {"line": ln}
                    # pass save flag from CLI (useful for receiver behavior)
                    send_event(payload, save=bool(args.save))

                # realtime pacing
                time.sleep(0.01)
        else:
            # Original batch mode
            for ln in lines:
                # write to file/stdout
                fh.write(ln + "\n")
                fh.flush()

                # send over HTTP unless --nosend provided
                if not args.nosend:
                    payload = {"line": ln}
                    # pass save flag from CLI (useful for receiver behavior)
                    send_event(payload, save=bool(args.save))
    finally:
        if fh is not sys.stdout:
            fh.close()


if __name__ == "__main__":
    main()
