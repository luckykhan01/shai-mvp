from __future__ import annotations

import os, json, logging, datetime as dt, statistics as stats
from typing import Any, Dict, List, Tuple, Deque, Optional
from collections import deque, defaultdict
from contextlib import contextmanager

from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction import DictVectorizer
from sklearn.exceptions import NotFittedError
import joblib

from psycopg2 import extras
from psycopg2.pool import SimpleConnectionPool


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("isoforest-model")

N_ESTIMATORS = int(os.getenv("N_ESTIMATORS", "200"))
CONTAMINATION = float(os.getenv("CONTAMINATION", "0.1"))
WINDOW_MINUTES = int(os.getenv("WINDOW_MINUTES", "10"))
MIN_TRAIN_ROWS = int(os.getenv("MIN_TRAIN_ROWS", "5"))
RETRAIN_EVERY = int(os.getenv("RETRAIN_EVERY", "1"))
HARD_FAIL_RATIO = float(os.getenv("HARD_FAIL_RATIO", "0.95"))
HARD_FAIL_MIN = int(os.getenv("HARD_FAIL_MIN", "20"))
TRAIN_BUFFER_SIZE = int(os.getenv("TRAIN_BUFFER_SIZE", "10000"))

MODEL_PATH = os.getenv("MODEL_PATH", "isoforest_perip.joblib")
ACTIONS_PATH = os.getenv("ACTIONS_PATH", "actions.jsonl")

PG_DSN = os.getenv("PG_DSN", "postgresql://ml:ml@localhost:5432/mlengine")
PG_SCHEMA = os.getenv("PG_SCHEMA", "public")
PG_MINCONN = int(os.getenv("PG_MINCONN", "1"))
PG_MAXCONN = int(os.getenv("PG_MAXCONN", "5"))


def parse_ts(iso: str) -> dt.datetime:
    return dt.datetime.fromisoformat(iso)


class PerIPWindow:
    """Буфер per-IP. Окно якорится на last_seen (ts текущего события)."""

    def __init__(self, window: dt.timedelta):
        self.window = window
        self._buf: Dict[str, Deque[Tuple[dt.datetime, Dict[str, Any]]]] = defaultdict(deque)

    def push(self, ev: Dict[str, Any]) -> None:
        ip = ev.get("source_ip") or "0.0.0.0"
        ts = parse_ts(ev["ts"])
        dq = self._buf[ip]
        dq.append((ts, ev))
        bound = ts - self.window
        while dq and dq[0][0] < bound:
            dq.popleft()

    def features_for_ip(self, ip: str) -> Dict[str, Any]:
        dq = self._buf.get(ip, deque())
        if not dq:
            return {
                "ip_recent_events": 0,
                "ip_recent_failed": 0,
                "ip_recent_success": 0,
                "ip_recent_fail_ratio": 0.0,
                "ip_unique_users": 0,
                "ip_unique_dports": 0,
                "ip_burst_60s_max": 0,
                "ip_inter_mean": 0.0,
                "ip_inter_std": 0.0,
            }

        times = [t for (t, _) in dq]
        outcomes = [e.get("outcome", "success") for (_, e) in dq]
        users = [e.get("user") for (_, e) in dq]
        dports = [e.get("dest_port") for (_, e) in dq]

        inter = []
        if len(times) >= 2:
            for a, b in zip(times[:-1], times[1:]):
                inter.append((b - a).total_seconds())

        burst_max = 0
        i = 0
        for j in range(len(times)):
            while times[j] - times[i] > dt.timedelta(seconds=60):
                i += 1
            burst_max = max(burst_max, j - i + 1)

        failed = sum(1 for o in outcomes if o == "failure")
        success = sum(1 for o in outcomes if o == "success")
        total = len(outcomes)

        return {
            "ip_recent_events": total,
            "ip_recent_failed": failed,
            "ip_recent_success": success,
            "ip_recent_fail_ratio": (failed / total) if total else 0.0,
            "ip_unique_users": len(set(u for u in users if u is not None)),
            "ip_unique_dports": len(set(dports)),
            "ip_burst_60s_max": burst_max,
            "ip_inter_mean": float(stats.fmean(inter)) if inter else 0.0,
            "ip_inter_std": float(stats.pstdev(inter)) if len(inter) > 1 else 0.0,
        }

    def current_ips(self) -> List[str]:
        return list(self._buf.keys())


class IsoForestPerIP:
    def __init__(
        self,
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        max_features=1.0,
        random_state=42,
        warm_start=False,
        window_minutes=WINDOW_MINUTES,
        train_buffer_size=TRAIN_BUFFER_SIZE,
        min_train_rows=MIN_TRAIN_ROWS,
        retrain_every_batches=RETRAIN_EVERY,
        hard_fail_ratio=HARD_FAIL_RATIO,
        hard_fail_min=HARD_FAIL_MIN,
        actions_path=ACTIONS_PATH,
        db_dsn: Optional[str] = PG_DSN,
        db_schema: str = PG_SCHEMA,
        db_minconn: int = PG_MINCONN,
        db_maxconn: int = PG_MAXCONN,
    ):
        self._clf = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_features=max_features,
            random_state=random_state,
            warm_start=warm_start,
            n_jobs=-1,
        )
        self._vec = DictVectorizer(sparse=True)
        self._is_fitted = False

        self._perip = PerIPWindow(window=dt.timedelta(minutes=window_minutes))
        self._train_rows: List[Dict[str, Any]] = []
        self._batches_seen = 0
        self._train_buffer_size = train_buffer_size
        self._min_train_rows = min_train_rows
        self._retrain_every_batches = retrain_every_batches

        self._hard_fail_ratio = hard_fail_ratio
        self._hard_fail_min = hard_fail_min

        self.actions_path = actions_path
        self._model_params = {
            "n_estimators": n_estimators,
            "contamination": contamination,
            "max_features": max_features,
            "random_state": random_state,
            "warm_start": warm_start,
            "window_minutes": window_minutes,
            "train_buffer_size": train_buffer_size,
            "min_train_rows": min_train_rows,
            "retrain_every_batches": retrain_every_batches,
            "hard_fail_ratio": hard_fail_ratio,
            "hard_fail_min": hard_fail_min,
            "actions_path": actions_path,
            "db_dsn": db_dsn,
            "db_schema": db_schema,
            "db_minconn": db_minconn,
            "db_maxconn": db_maxconn,
        }

        # DB (PostgreSQL)
        self._db_dsn = db_dsn
        self._db_schema = db_schema
        self._db_minconn = db_minconn
        self._db_maxconn = db_maxconn
        self._pool: Optional[SimpleConnectionPool] = None

    def _ensure_pool(self):
        if not self._db_dsn:
            return
        if self._pool is None:
            self._pool = SimpleConnectionPool(
                self._db_minconn, self._db_maxconn, dsn=self._db_dsn
            )
            with self._db() as conn:
                self._init_db(conn)

    @contextmanager
    def _db(self):
        if not self._db_dsn:
            yield None
            return
        self._ensure_pool()
        conn = self._pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    def _init_db(self, conn):
        with conn.cursor() as cur:
            cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{self._db_schema}";')
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".events (
                event_id TEXT PRIMARY KEY,
                ts TIMESTAMPTZ,
                source_ip TEXT,
                source_port INTEGER,
                dest_ip TEXT,
                dest_port INTEGER,
                "user" TEXT,
                service TEXT,
                sensor TEXT,
                event_type TEXT,
                action TEXT,
                outcome TEXT,
                message TEXT,
                protocol TEXT,
                bytes DOUBLE PRECISION,
                scenario TEXT,
                metadata JSONB
            );
            """)
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_events_ts ON "{self._db_schema}".events(ts);')
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_events_ip ON "{self._db_schema}".events(source_ip);')
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".features (
                ts TIMESTAMPTZ,
                ip TEXT,
                ip_recent_events INTEGER,
                ip_recent_failed INTEGER,
                ip_recent_success INTEGER,
                ip_recent_fail_ratio DOUBLE PRECISION,
                ip_unique_users INTEGER,
                ip_unique_dports INTEGER,
                ip_burst_60s_max INTEGER,
                ip_inter_mean DOUBLE PRECISION,
                ip_inter_std DOUBLE PRECISION,
                PRIMARY KEY (ts, ip)
            );
            """)
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_features_ip ON "{self._db_schema}".features(ip);')
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".actions (
                ts TIMESTAMPTZ,
                action TEXT,
                ip TEXT,
                iso_score DOUBLE PRECISION,
                recent_failed DOUBLE PRECISION,
                recent_events DOUBLE PRECISION,
                recent_fail_ratio DOUBLE PRECISION,
                reason TEXT
            );
            """)
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_actions_ts ON "{self._db_schema}".actions(ts);')
            
            # Инициализируем таблицы списков
            self._init_lists_tables(conn)

    def _db_insert_events(self, conn, batch: List[Dict[str, Any]]):
        if not batch:
            return
        rows = []
        for ev in batch:
            rows.append((
                ev.get("event_id"),
                ev.get("ts"),
                ev.get("source_ip"),
                ev.get("source_port"),
                ev.get("dest_ip"),
                ev.get("dest_port"),
                ev.get("user"),
                ev.get("service"),
                ev.get("sensor"),
                ev.get("event_type"),
                ev.get("action"),
                ev.get("outcome"),
                ev.get("message"),
                ev.get("protocol"),
                ev.get("bytes"),
                ev.get("scenario"),
                extras.Json(ev.get("metadata", {})),
            ))
        with conn.cursor() as cur:
            extras.execute_values(cur, f"""
                INSERT INTO "{self._db_schema}".events (
                    event_id, ts, source_ip, source_port, dest_ip, dest_port, "user",
                    service, sensor, event_type, action, outcome, message, protocol,
                    bytes, scenario, metadata
                ) VALUES %s
                ON CONFLICT (event_id) DO NOTHING;
            """, rows, page_size=200)

    def _db_insert_features(self, conn, ts_iso: str, ip_feats: List[Dict[str, Any]]):
        if not ip_feats:
            return
        rows = []
        for row in ip_feats:
            rows.append((
                ts_iso,
                row["ip"],
                int(row["ip_recent_events"]),
                int(row["ip_recent_failed"]),
                int(row["ip_recent_success"]),
                float(row["ip_recent_fail_ratio"]),
                int(row["ip_unique_users"]),
                int(row["ip_unique_dports"]),
                int(row["ip_burst_60s_max"]),
                float(row["ip_inter_mean"]),
                float(row["ip_inter_std"]),
            ))
        with conn.cursor() as cur:
            extras.execute_values(cur, f"""
                INSERT INTO "{self._db_schema}".features (
                    ts, ip, ip_recent_events, ip_recent_failed, ip_recent_success,
                    ip_recent_fail_ratio, ip_unique_users, ip_unique_dports,
                    ip_burst_60s_max, ip_inter_mean, ip_inter_std
                ) VALUES %s
                ON CONFLICT (ts, ip) DO NOTHING;
            """, rows, page_size=200)

    def _db_insert_actions(self, conn, actions: List[Dict[str, Any]]):
        if not actions:
            return
        rows = []
        for a in actions:
            rows.append((
                a.get("ts"),
                a.get("action"),
                a.get("ip"),
                a.get("iso_score"),
                a.get("recent_failed"),
                a.get("recent_events"),
                a.get("recent_fail_ratio"),
                a.get("reason"),
            ))
        with conn.cursor() as cur:
            extras.execute_values(cur, f"""
                INSERT INTO "{self._db_schema}".actions (
                    ts, action, ip, iso_score, recent_failed, recent_events, recent_fail_ratio, reason
                ) VALUES %s;
            """, rows, page_size=200)

    def _auto_block_ips(self, conn, actions: List[Dict[str, Any]]):
        """Автоматически добавляет IP в черный список при block_ip action"""
        if not actions:
            return
        now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
        for act in actions:
            if act.get("action") == "block_ip":
                ip = act.get("ip")
                reason = act.get("reason", "Automatically blocked by ML detector")
                try:
                    with conn.cursor() as cur:
                        # Проверяем, не находится ли IP уже в черном списке
                        cur.execute(f"""
                            SELECT id FROM "{self._db_schema}".deny_list 
                            WHERE item_type = 'ip' AND value = %s
                        """, (ip,))
                        existing = cur.fetchone()
                        if not existing:
                            # Добавляем в черный список
                            cur.execute(f"""
                                INSERT INTO "{self._db_schema}".deny_list 
                                    (item_type, value, description, created_at)
                                VALUES ('ip', %s, %s, %s)
                            """, (ip, f"Auto-blocked: {reason}", now_iso))
                            print(f"[AUTO-BLOCK] Added {ip} to blacklist: {reason}")
                except Exception as e:
                    print(f"[AUTO-BLOCK] Error adding {ip} to blacklist: {e}")

    def _vectorize_fit(self, feats: List[Dict[str, Any]]):
        self._vec = DictVectorizer(sparse=True)
        return self._vec.fit_transform(feats)

    def _vectorize(self, feats: List[Dict[str, Any]]):
        if not hasattr(self._vec, "vocabulary_"):
            raise NotFittedError("Vectorizer not fitted")
        return self._vec.transform(feats)

    def _append_actions_file(self, actions: List[Dict[str, Any]]):
        if not actions:
            return
        with open(self.actions_path, "a", encoding="utf-8") as fh:
            for a in actions:
                fh.write(json.dumps(a, ensure_ascii=False) + "\n")

    def update_and_detect(self, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not isinstance(batch, list) or (batch and not isinstance(batch[0], dict)):
            raise TypeError("Batch must be List[Dict[str, Any]]")
        if not batch:
            return {"total": 0, "table": [], "actions_written": 0, "trained": self._is_fitted}

        with self._db() as conn:
            if conn is not None:
                self._db_insert_events(conn, batch)
        for ev in batch:
            self._perip.push(ev)

        ips = self._perip.current_ips()
        ip_feats: List[Dict[str, Any]] = []
        for ip in ips:
            f = self._perip.features_for_ip(ip)
            f["ip"] = ip
            ip_feats.append(f)

        self._train_rows.extend([{k: v for k, v in row.items() if k != "ip"} for row in ip_feats])
        if len(self._train_rows) > self._train_buffer_size:
            self._train_rows = self._train_rows[-self._train_buffer_size:]
        self._batches_seen += 1

        need_initial_fit = (not self._is_fitted) and (len(self._train_rows) >= self._min_train_rows)
        need_retrain = self._is_fitted and (self._batches_seen % self._retrain_every_batches == 0)
        if need_initial_fit or need_retrain:
            Xtrain = self._vectorize_fit(self._train_rows)
            self._clf.fit(Xtrain)
            self._is_fitted = True
            
            cleanup_result = self.cleanup_old_data(keep_hours=0.1)
            log.info("Cleanup after retrain: %s", cleanup_result)

        table = []
        actions = []
        if self._is_fitted:
            X = self._vectorize([{k: v for k, v in row.items() if k != "ip"} for row in ip_feats])
            iso_scores = self._clf.score_samples(X)   # меньше => аномальнее
            iso_pred = self._clf.predict(X)           # -1 / 1
            for row, score, pred in zip(ip_feats, iso_scores, iso_pred):
                table.append({
                    "ip": row["ip"],
                    "recent_failed": float(row["ip_recent_failed"]),
                    "recent_events": float(row["ip_recent_events"]),
                    "recent_fail_ratio": float(row["ip_recent_fail_ratio"]),
                    "iso_score": float(score),
                    "iso_pred": int(pred),
                })
                hard = (row["ip_recent_fail_ratio"] >= self._hard_fail_ratio and
                        row["ip_recent_failed"] >= self._hard_fail_min)
                if pred == -1 or hard:
                    actions.append({
                        "ts": dt.datetime.now(dt.timezone.utc).isoformat(),
                        "action": "block_ip" if hard else "flag_ip",
                        "ip": row["ip"],
                        "iso_score": float(score),
                        "recent_failed": float(row["ip_recent_failed"]),
                        "recent_events": float(row["ip_recent_events"]),
                        "recent_fail_ratio": float(row["ip_recent_fail_ratio"]),
                        "reason": (
                            f"Too many failed logins in window (recent_failed={row['ip_recent_failed']}, "
                            f"recent_fail_ratio={row['ip_recent_fail_ratio']:.2f})"
                            if hard else "Anomalous by IsolationForest (iso_pred=-1)"
                        ),
                    })
        else:
            for row in ip_feats:
                table.append({
                    "ip": row["ip"],
                    "recent_failed": float(row["ip_recent_failed"]),
                    "recent_events": float(row["ip_recent_events"]),
                    "recent_fail_ratio": float(row["ip_recent_fail_ratio"]),
                    "iso_score": None,
                    "iso_pred": None,
                })

        self._append_actions_file(actions)
        with self._db() as conn:
            if conn is not None:
                now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
                self._db_insert_features(conn, now_iso, ip_feats)
                self._db_insert_actions(conn, actions)
                # Автоматически добавляем IP в черный список при block_ip
                self._auto_block_ips(conn, actions)

        table_sorted = sorted(table, key=lambda r: (r["iso_score"] if r["iso_score"] is not None else float("inf")))
        return {
            "total": len(batch),
            "trained": self._is_fitted,
            "table": table_sorted,
            "actions_written": len(actions),
        }

    def save(self, path: str):
        payload = {
            "params": self._model_params,
            "_vec": self._vec,
            "_clf": self._clf,
            "_is_fitted": self._is_fitted,
            "_train_rows": self._train_rows,
            "_batches_seen": self._batches_seen,
        }
        joblib.dump(payload, path)

    @classmethod
    def load(cls, path: str) -> "IsoForestPerIP":
        payload = joblib.load(path)
        obj = cls(**payload["params"])
        obj._vec = payload["_vec"]
        obj._clf = payload["_clf"]
        obj._is_fitted = payload["_is_fitted"]
        obj._train_rows = payload["_train_rows"]
        obj._batches_seen = payload["_batches_seen"]
        return obj

    def train_from_db(self, since: Optional[str] = None, until: Optional[str] = None, limit: Optional[int] = 5000):
        if not self._db_dsn:
            raise RuntimeError("PostgreSQL DSN is not configured")
        self._ensure_pool()
        with self._db() as conn:
            with conn.cursor() as cur:
                q = f"""
                SELECT ip_recent_events, ip_recent_failed, ip_recent_success,
                       ip_recent_fail_ratio, ip_unique_users, ip_unique_dports,
                       ip_burst_60s_max, ip_inter_mean, ip_inter_std
                FROM "{self._db_schema}".features
                """
                clauses, params = [], []
                if since:
                    clauses.append("ts >= %s"); params.append(since)
                if until:
                    clauses.append("ts <= %s"); params.append(until)
                if clauses:
                    q += " WHERE " + " AND ".join(clauses)
                q += " ORDER BY ts DESC"
                if limit:
                    q += " LIMIT %s"; params.append(int(limit))
                cur.execute(q, params)
                rows = cur.fetchall()

        if not rows:
            return {"trained": self._is_fitted, "rows_used": 0}

        feats = [{
            "ip_recent_events": r[0],
            "ip_recent_failed": r[1],
            "ip_recent_success": r[2],
            "ip_recent_fail_ratio": r[3],
            "ip_unique_users": r[4],
            "ip_unique_dports": r[5],
            "ip_burst_60s_max": r[6],
            "ip_inter_mean": r[7],
            "ip_inter_std": r[8],
        } for r in rows]

        Xtrain = self._vectorize_fit(feats)
        self._clf.fit(Xtrain)
        self._is_fitted = True
        self._train_rows = feats[-TRAIN_BUFFER_SIZE:]
        
        cleanup_result = self.cleanup_old_data(keep_hours=0.1)
        log.info("Cleanup after training: %s", cleanup_result)
        
        return {"trained": True, "rows_used": len(feats), "cleanup": cleanup_result}

    def cleanup_old_data(self, keep_hours: int = 24):
        """Удаляет старые данные, но сохраняет записи с ошибками на 7 дней"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM events 
                        WHERE ts < NOW() - INTERVAL '%s hours'
                        AND outcome NOT IN ('failed', 'blocked', 'error', 'deny')
                    """, (keep_hours,))
                    events_deleted = cur.rowcount
                    
                    cur.execute("""
                        DELETE FROM features 
                        WHERE ts < NOW() - INTERVAL '%s hours'
                    """, (keep_hours,))
                    features_deleted = cur.rowcount
                    
                    cur.execute("""
                        DELETE FROM actions 
                        WHERE ts < NOW() - INTERVAL '%s hours'
                        AND iso_score < 0.5
                    """, (keep_hours,))
                    actions_deleted = cur.rowcount
                    
                    cur.execute("""
                        DELETE FROM events 
                        WHERE ts < NOW() - INTERVAL '7 days'
                        AND outcome IN ('failed', 'blocked', 'error', 'deny')
                    """)
                    old_errors_deleted = cur.rowcount
                    
                    cur.execute("""
                        DELETE FROM actions 
                        WHERE ts < NOW() - INTERVAL '7 days'
                        AND iso_score >= 0.5
                    """)
                    old_anomalies_deleted = cur.rowcount
                    
                    conn.commit()
                    
                    return {
                        "events_deleted": events_deleted,
                        "features_deleted": features_deleted, 
                        "actions_deleted": actions_deleted,
                        "old_errors_deleted": old_errors_deleted,
                        "old_anomalies_deleted": old_anomalies_deleted,
                        "kept_error_logs": True,
                        "error_retention_days": 7
                    }
        except Exception as e:
            log.error("Cleanup failed: %s", e)
            return {"error": str(e)}

    def get_recent_anomalies(self, limit: int = 20):
        """Получает последние аномалии из базы данных"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT ts, action, ip, iso_score, recent_failed, recent_events, 
                               recent_fail_ratio, reason
                        FROM "{self._db_schema}".actions
                        ORDER BY ts DESC
                        LIMIT %s
                    """, (limit,))
                    rows = cur.fetchall()
                    
                    anomalies = []
                    for row in rows:
                        anomalies.append({
                            "ts": row[0].isoformat() if row[0] else None,
                            "action": row[1],
                            "ip": row[2],
                            "iso_score": float(row[3]) if row[3] is not None else None,
                            "recent_failed": float(row[4]) if row[4] is not None else None,
                            "recent_events": float(row[5]) if row[5] is not None else None,
                            "recent_fail_ratio": float(row[6]) if row[6] is not None else None,
                            "reason": row[7]
                        })
                    
                    return {
                        "anomalies": anomalies,
                        "count": len(anomalies),
                        "limit": limit
                    }
        except Exception as e:
            log.error("Failed to get recent anomalies: %s", e)
            return {"error": str(e)}

    def get_anomalies_by_ip(self, ip: str, limit: int = 50):
        """Получает аномалии для конкретного IP адреса"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT ts, action, ip, iso_score, recent_failed, recent_events, 
                               recent_fail_ratio, reason
                        FROM "{self._db_schema}".actions
                        WHERE ip = %s
                        ORDER BY ts DESC
                        LIMIT %s
                    """, (ip, limit))
                    rows = cur.fetchall()
                    
                    anomalies = []
                    for row in rows:
                        anomalies.append({
                            "ts": row[0].isoformat() if row[0] else None,
                            "action": row[1],
                            "ip": row[2],
                            "iso_score": float(row[3]) if row[3] is not None else None,
                            "recent_failed": float(row[4]) if row[4] is not None else None,
                            "recent_events": float(row[5]) if row[5] is not None else None,
                            "recent_fail_ratio": float(row[6]) if row[6] is not None else None,
                            "reason": row[7]
                        })
                    
                    return {
                        "anomalies": anomalies,
                        "count": len(anomalies),
                        "ip": ip,
                        "limit": limit
                    }
        except Exception as e:
            log.error("Failed to get anomalies by IP %s: %s", ip, e)
            return {"error": str(e)}

    def get_events_by_ip(self, ip: str, limit: int = 100):
        """Получает события (логи) для конкретного IP адреса"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT event_id, ts, source_ip, source_port, dest_ip, dest_port, 
                               "user", service, sensor, event_type, action, outcome, 
                               message, protocol, bytes, scenario, metadata
                        FROM "{self._db_schema}".events
                        WHERE source_ip = %s
                        ORDER BY ts DESC
                        LIMIT %s
                    """, (ip, limit))
                    rows = cur.fetchall()
                    
                    events = []
                    for row in rows:
                        events.append({
                            "event_id": row[0],
                            "ts": row[1].isoformat() if row[1] else None,
                            "source_ip": row[2],
                            "source_port": row[3],
                            "dest_ip": row[4],
                            "dest_port": row[5],
                            "user": row[6],
                            "service": row[7],
                            "sensor": row[8],
                            "event_type": row[9],
                            "action": row[10],
                            "outcome": row[11],
                            "message": row[12],
                            "protocol": row[13],
                            "bytes": float(row[14]) if row[14] is not None else None,
                            "scenario": row[15],
                            "metadata": row[16] if row[16] else {}
                        })
                    
                    return {
                        "events": events,
                        "count": len(events),
                        "ip": ip,
                        "limit": limit
                    }
        except Exception as e:
            log.error("Failed to get events by IP %s: %s", ip, e)
            return {"error": str(e)}

    def get_ips_summary(self, limit: int = 100):
        """Получает список IP адресов с краткой статистикой"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT ip, ip_recent_events, ip_recent_failed, ip_recent_fail_ratio
                        FROM "{self._db_schema}".features
                        ORDER BY ts DESC
                        LIMIT %s
                    """, (limit,))
                    rows = cur.fetchall()
                    
                    ips = []
                    seen_ips = set()
                    for row in rows:
                        ip = row[0]
                        if ip not in seen_ips:
                            ips.append({
                                "ip": ip,
                                "recent_events": int(row[1]) if row[1] is not None else 0,
                                "recent_failed": int(row[2]) if row[2] is not None else 0,
                                "recent_fail_ratio": float(row[3]) if row[3] is not None else 0.0
                            })
                            seen_ips.add(ip)
                    
                    return {
                        "ips": ips,
                        "count": len(ips),
                        "limit": limit
                    }
        except Exception as e:
            log.error("Failed to get IPs summary: %s", e)
            return {"error": str(e)}

    def _init_lists_tables(self, conn):
        """Инициализирует таблицы для списков"""
        with conn.cursor() as cur:
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".allow_lists (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('ip', 'user', 'network')),
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ,
                UNIQUE(type, value)
            );
            """)
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".deny_lists (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('ip', 'user', 'network')),
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ,
                UNIQUE(type, value)
            );
            """)
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS "{self._db_schema}".suppress_lists (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('ip', 'user', 'pattern')),
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                UNIQUE(type, value)
            );
            """)
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_allow_type_value ON "{self._db_schema}".allow_lists(type, value);')
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_deny_type_value ON "{self._db_schema}".deny_lists(type, value);')
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_suppress_type_value ON "{self._db_schema}".suppress_lists(type, value);')
            cur.execute(f'CREATE INDEX IF NOT EXISTS idx_suppress_expires ON "{self._db_schema}".suppress_lists(expires_at);')

    def get_allow_list(self):
        """Получает список разрешенных IP/пользователей/сетей"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT id, type, value, description, created_at, expires_at
                        FROM "{self._db_schema}".allow_lists
                        WHERE expires_at IS NULL OR expires_at > NOW()
                        ORDER BY created_at DESC
                    """)
                    rows = cur.fetchall()
                    
                    items = []
                    for row in rows:
                        items.append({
                            "id": row[0],
                            "type": row[1],
                            "value": row[2],
                            "description": row[3],
                            "created_at": row[4].isoformat() if row[4] else None,
                            "expires_at": row[5].isoformat() if row[5] else None
                        })
                    
                    return {"items": items, "count": len(items)}
        except Exception as e:
            log.error("Failed to get allow list: %s", e)
            return {"error": str(e)}

    def add_allow_item(self, item_type: str, value: str, description: str = None, expires_at: str = None):
        """Добавляет элемент в список разрешений"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    expires_sql = "NULL"
                    if expires_at:
                        expires_sql = f"'{expires_at}'::timestamptz"
                    
                    cur.execute(f"""
                        INSERT INTO "{self._db_schema}".allow_lists (type, value, description, expires_at)
                        VALUES (%s, %s, %s, {expires_sql})
                        ON CONFLICT (type, value) DO UPDATE SET
                            description = EXCLUDED.description,
                            expires_at = EXCLUDED.expires_at
                        RETURNING id, created_at
                    """, (item_type, value, description))
                    
                    result = cur.fetchone()
                    return {
                        "id": result[0],
                        "type": item_type,
                        "value": value,
                        "description": description,
                        "created_at": result[1].isoformat(),
                        "expires_at": expires_at
                    }
        except Exception as e:
            log.error("Failed to add allow item: %s", e)
            return {"error": str(e)}

    def delete_allow_item(self, item_id: int = None, item_type: str = None, value: str = None):
        """Удаляет элемент из списка разрешений"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    if item_id:
                        cur.execute(f"DELETE FROM \"{self._db_schema}\".allow_lists WHERE id = %s", (item_id,))
                    elif item_type and value:
                        cur.execute(f"DELETE FROM \"{self._db_schema}\".allow_lists WHERE type = %s AND value = %s", (item_type, value))
                    else:
                        return {"error": "Either item_id or (item_type and value) must be provided"}
                    
                    return {"deleted": cur.rowcount > 0, "count": cur.rowcount}
        except Exception as e:
            log.error("Failed to delete allow item: %s", e)
            return {"error": str(e)}

    def get_deny_list(self):
        """Получает список заблокированных IP/пользователей/сетей"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT id, type, value, description, created_at, expires_at
                        FROM "{self._db_schema}".deny_lists
                        WHERE expires_at IS NULL OR expires_at > NOW()
                        ORDER BY created_at DESC
                    """)
                    rows = cur.fetchall()
                    
                    items = []
                    for row in rows:
                        items.append({
                            "id": row[0],
                            "type": row[1],
                            "value": row[2],
                            "description": row[3],
                            "created_at": row[4].isoformat() if row[4] else None,
                            "expires_at": row[5].isoformat() if row[5] else None
                        })
                    
                    return {"items": items, "count": len(items)}
        except Exception as e:
            log.error("Failed to get deny list: %s", e)
            return {"error": str(e)}

    def add_deny_item(self, item_type: str, value: str, description: str = None, expires_at: str = None):
        """Добавляет элемент в список блокировок"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    expires_sql = "NULL"
                    if expires_at:
                        expires_sql = f"'{expires_at}'::timestamptz"
                    
                    cur.execute(f"""
                        INSERT INTO "{self._db_schema}".deny_lists (type, value, description, expires_at)
                        VALUES (%s, %s, %s, {expires_sql})
                        ON CONFLICT (type, value) DO UPDATE SET
                            description = EXCLUDED.description,
                            expires_at = EXCLUDED.expires_at
                        RETURNING id, created_at
                    """, (item_type, value, description))
                    
                    result = cur.fetchone()
                    return {
                        "id": result[0],
                        "type": item_type,
                        "value": value,
                        "description": description,
                        "created_at": result[1].isoformat(),
                        "expires_at": expires_at
                    }
        except Exception as e:
            log.error("Failed to add deny item: %s", e)
            return {"error": str(e)}

    def delete_deny_item(self, item_id: int = None, item_type: str = None, value: str = None):
        """Удаляет элемент из списка блокировок"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    if item_id:
                        cur.execute(f"DELETE FROM \"{self._db_schema}\".deny_lists WHERE id = %s", (item_id,))
                    elif item_type and value:
                        cur.execute(f"DELETE FROM \"{self._db_schema}\".deny_lists WHERE type = %s AND value = %s", (item_type, value))
                    else:
                        return {"error": "Either item_id or (item_type and value) must be provided"}
                    
                    return {"deleted": cur.rowcount > 0, "count": cur.rowcount}
        except Exception as e:
            log.error("Failed to delete deny item: %s", e)
            return {"error": str(e)}

    def add_suppress_item(self, item_type: str, value: str, minutes: int, description: str = None):
        """Добавляет элемент в список подавления оповещений"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=minutes)
                    
                    cur.execute(f"""
                        INSERT INTO "{self._db_schema}".suppress_lists (type, value, description, expires_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (type, value) DO UPDATE SET
                            description = EXCLUDED.description,
                            expires_at = EXCLUDED.expires_at
                        RETURNING id, created_at
                    """, (item_type, value, description, expires_at))
                    
                    result = cur.fetchone()
                    return {
                        "id": result[0],
                        "type": item_type,
                        "value": value,
                        "description": description,
                        "created_at": result[1].isoformat(),
                        "expires_at": expires_at.isoformat(),
                        "minutes": minutes
                    }
        except Exception as e:
            log.error("Failed to add suppress item: %s", e)
            return {"error": str(e)}

    def export_actions_ndjson(self, since: str = None, until: str = None, limit: int = 10000):
        """Экспортирует аномалии в формате NDJSON для SIEM"""
        if not self._db_dsn:
            return {"error": "PostgreSQL DSN is not configured"}
        
        try:
            self._ensure_pool()
            with self._db() as conn:
                with conn.cursor() as cur:
                    query = f"""
                        SELECT ts, action, ip, iso_score, recent_failed, recent_events, 
                               recent_fail_ratio, reason
                        FROM "{self._db_schema}".actions
                    """
                    params = []
                    conditions = []
                    
                    if since:
                        conditions.append("ts >= %s")
                        params.append(since)
                    if until:
                        conditions.append("ts <= %s")
                        params.append(until)
                    
                    if conditions:
                        query += " WHERE " + " AND ".join(conditions)
                    
                    query += " ORDER BY ts DESC"
                    
                    if limit:
                        query += " LIMIT %s"
                        params.append(limit)
                    
                    cur.execute(query, params)
                    rows = cur.fetchall()
                    
                    ndjson_lines = []
                    for row in rows:
                        record = {
                            "timestamp": row[0].isoformat() if row[0] else None,
                            "action": row[1],
                            "source_ip": row[2],
                            "anomaly_score": float(row[3]) if row[3] is not None else None,
                            "recent_failed_attempts": int(row[4]) if row[4] is not None else 0,
                            "recent_total_events": int(row[5]) if row[5] is not None else 0,
                            "failure_ratio": float(row[6]) if row[6] is not None else 0.0,
                            "reason": row[7],
                            "event_type": "anomaly_detection",
                            "severity": "high" if row[1] == "block_ip" else "medium",
                            "source": "ml-detector",
                            "exported_at": dt.datetime.now(dt.timezone.utc).isoformat()
                        }
                        ndjson_lines.append(json.dumps(record, ensure_ascii=False))
                    
                    return {
                        "ndjson": "\n".join(ndjson_lines),
                        "count": len(ndjson_lines),
                        "since": since,
                        "until": until,
                        "limit": limit
                    }
        except Exception as e:
            log.error("Failed to export actions NDJSON: %s", e)
            return {"error": str(e)}

