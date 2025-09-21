# services/parser/app/rules.py
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Dict, Deque, List, Tuple

SENSITIVE_USERS = {"root", "admin", "postgres", "elastic", "guest"}
CRITICAL_PORTS = {22, 23, 3389, 445, 9200}

def _parse_ts(ts: str | None) -> datetime:
    if not ts:
        return datetime.now(timezone.utc)
    try:
        if ts.endswith("Z"):
            ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts)
    except Exception:
        return datetime.now(timezone.utc)

class RuleEngine:
    def __init__(self, max_keep: int = 1000):
        # скользящие окна
        self.failed_by_ip: Dict[str, Deque[datetime]] = defaultdict(deque)             # SSH fails /60s
        self.fail_success_chain: Dict[Tuple[str,str], Deque[Tuple[str,datetime]]] = defaultdict(deque)  # (outcome,ts) /5m
        self.scan_by_srcdst: Dict[Tuple[str,str], Deque[Tuple[datetime,int]]] = defaultdict(deque)      # (ts,port) /30s
        self.denies_by_ip: Dict[str, Deque[datetime]] = defaultdict(deque)            # FW DENY critical ports /60s
        self.errors_by_service: Dict[str, Deque[datetime]] = defaultdict(deque)       # app ERROR /10s

        self.recent_incidents: Deque[dict] = deque(maxlen=max_keep)

    @staticmethod
    def _drop_old(dq: Deque, now: datetime, window: timedelta):
        while dq and (now - dq[0]) > window:
            dq.popleft()

    def _mk_incident(self, kind: str, severity: str, title: str, ev: dict, extra: dict | None = None) -> dict:
        return {
            "kind": kind,
            "severity": severity,
            "title": title,
            "at": ev.get("ts"),
            "source_ip": ev.get("source_ip"),
            "dest_ip": ev.get("dest_ip"),
            "dest_port": ev.get("dest_port"),
            "user": ev.get("user"),
            "service": ev.get("service"),
            "event_id": ev.get("event_id"),
            "base_event": ev,
            "extra": extra or {}
        }

    def process(self, ev: dict) -> List[dict]:
        alerts: List[dict] = []
        now = _parse_ts(ev.get("ts"))
        et = ev.get("event_type")
        msg = str(ev.get("message") or "")
        src = ev.get("source_ip")
        dst = ev.get("dest_ip")
        dpt = ev.get("dest_port")
        user = ev.get("user")
        service = ev.get("service")
        action = (ev.get("action") or "").lower()
        outcome = (ev.get("outcome") or "").lower()

        # SSH
        if et == "auth" and (ev.get("protocol") or "").lower() == "ssh":
            # брут: ≥5 fail /60s с одного IP
            if outcome == "failed" and src:
                dq = self.failed_by_ip[src]
                dq.append(now)
                self._drop_old(dq, now, timedelta(seconds=60))
                if len(dq) >= 5:
                    alerts.append(self._mk_incident(
                        "ssh_bruteforce", "high",
                        f"Много неудачных входов по SSH: {len(dq)} за 60с", ev,
                        {"count_60s": len(dq)}
                    ))
            # успех после серии фейлов: ≥3 fail → success /5m
            if src and user:
                key = (src, str(user))
                chain = self.fail_success_chain[key]
                chain.append((outcome, now))
                while chain and (now - chain[0][1]) > timedelta(minutes=5):
                    chain.popleft()
                fails = sum(1 for o, _t in chain if o == "failed")
                if outcome == "success" and fails >= 3:
                    alerts.append(self._mk_incident(
                        "ssh_success_after_fail", "critical",
                        f"Успешный вход после {fails} неудачных за 5м", ev,
                        {"fails_before": fails}
                    ))
            # чувствительные пользователи — любая неудача
            if outcome == "failed" and str(user or "").lower() in SENSITIVE_USERS:
                alerts.append(self._mk_incident(
                    "ssh_sensitive_user_fail", "high",
                    f"Неудачный вход чувствительного пользователя: {user}", ev
                ))

        # Firewall
        if et == "network":
            # порт-скан: ≥10 уникальных портов /30с по (src→dst)
            if src and dst and dpt is not None:
                key = (src, dst)
                dq = self.scan_by_srcdst[key]
                dq.append((now, int(dpt)))
                while dq and (now - dq[0][0]) > timedelta(seconds=30):
                    dq.popleft()
                uniq_ports = len({p for _t, p in dq})
                if uniq_ports >= 10:
                    alerts.append(self._mk_incident(
                        "port_scan", "medium",
                        f"Похоже на сканирование: {uniq_ports} портов за 30с", ev,
                        {"unique_ports_30s": uniq_ports}
                    ))
            # критичные порты: ≥5 DENY на {22,23,3389,445,9200} /60с от одного IP
            if action == "deny" and src and (dpt in CRITICAL_PORTS):
                dq = self.denies_by_ip[src]
                dq.append(now)
                self._drop_old(dq, now, timedelta(seconds=60))
                if len(dq) >= 5:
                    alerts.append(self._mk_incident(
                        "critical_ports_probe", "high",
                        f"Много DENY на чувствительные порты: {len(dq)} за 60с", ev,
                        {"count_60s": len(dq)}
                    ))

        # App-логи
        if et in ("app_log", "app_error"):
            # всплеск ошибок: ≥5 ERROR /10с на один сервис
            level = (ev.get("metadata", {}) or {}).get("level", "").upper()
            is_err = ev.get("outcome") == "error" or level == "ERROR"
            if is_err and service:
                dq = self.errors_by_service[str(service)]
                dq.append(now)
                self._drop_old(dq, now, timedelta(seconds=10))
                if len(dq) >= 5:
                    alerts.append(self._mk_incident(
                        "app_error_burst", "medium",
                        f"Всплеск ошибок в {service}: {len(dq)} за 10с", ev,
                        {"count_10s": len(dq)}
                    ))
            # простые сигнатуры опасных payload’ов
            if any(s in msg for s in ("Unauthorized", "<script>", "evil()", "EvilClass")):
                alerts.append(self._mk_incident(
                    "app_suspicious_payload", "medium",
                    "Подозрительная строка в логе приложения", ev
                ))

        for a in alerts:
            self.recent_incidents.append(a)
        return alerts
