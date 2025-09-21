#!/usr/bin/env python3
"""
shipper.py

Reads a JSONL file (normalized events), sends new events in batches to ML /score endpoint,
and maintains a checkpoint file to avoid resending events across restarts.

Usage:
  python shipper.py --file normalized.jsonl --ml http://localhost:8001/score --batch 200 --interval 0.5

It supports:
 - checkpointing (default: shipper.checkpoint)
 - batch size and flush interval
 - exponential backoff retries on sender errors
"""
import argparse
import json
import os
import time
import logging
from typing import List
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shipper")

DEFAULT_CHECKPOINT = "shipper.checkpoint"

def read_checkpoint(cp_path: str) -> int:
    try:
        with open(cp_path, "r") as fh:
            s = fh.read().strip()
            return int(s) if s else 0
    except FileNotFoundError:
        return 0
    except Exception:
        logger.exception("Failed to read checkpoint, starting at 0")
        return 0

def write_checkpoint(cp_path: str, offset: int):
    tmp = cp_path + ".tmp"
    with open(tmp, "w") as fh:
        fh.write(str(offset))
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, cp_path)

def tail_batch(file_path: str, start_offset: int, max_lines: int):
    """Read up to max_lines JSON objects from file starting at byte offset start_offset.
    Returns (events, new_offset)."""
    if max_lines <= 0:
        return [], start_offset

    events = []
    new_offset = start_offset

    with open(file_path, "r", encoding="utf-8") as fh:
        fh.seek(start_offset)
        lines_read = 0
        while lines_read < max_lines:
            pos_before = fh.tell()
            line = fh.readline()
            if not line:
                # EOF: вернуть позицию до чтения пустой строки (последняя валидная позиция)
                new_offset = pos_before
                break

            new_offset = fh.tell()  # позиция сразу после прочитанной строки
            s = line.strip()
            if s:
                try:
                    events.append(json.loads(s))
                except Exception:
                    logging.exception("Failed to parse JSON at offset %d; skipping", pos_before)
            lines_read += 1

    return events, new_offset

def ship_batch(ml_url: str, batch: List[dict], max_retries: int = 6, initial_backoff: float = 0.5) -> bool:
    """Send batch to ML. Return True on success, False on permanent failure."""
    if not batch:
        return True
    payload = {"events": batch}
    attempt = 0
    backoff = initial_backoff
    while attempt <= max_retries:
        try:
            r = requests.post(ml_url, json=payload, timeout=8.0)
            r.raise_for_status()
            logger.info("Shipped batch size=%d success (status=%s)", len(batch), r.status_code)
            return True
        except requests.exceptions.RequestException as e:
            attempt += 1
            logger.warning("Failed to ship batch (attempt %d/%d): %s", attempt, max_retries, e)
            time.sleep(backoff)
            backoff = min(backoff * 2, 8.0)
    logger.error("Giving up after %d attempts for batch size=%d", max_retries, len(batch))
    return False

def run_loop(file_path: str, ml_url: str, checkpoint_path: str, batch_size: int, flush_interval: float, poll_interval: float):
    offset = read_checkpoint(checkpoint_path)
    logger.info("Starting shipper: file=%s ml=%s checkpoint=%s offset=%d", file_path, ml_url, checkpoint_path, offset)
    buffer = []
    last_flush = time.time()

    # Ensure file exists
    if not os.path.exists(file_path):
        logger.warning("Input file %s does not exist yet. Waiting...", file_path)

    while True:
        # Try to open and read next events
        try:
            size = os.path.getsize(file_path)
            if offset > size:
                logger.warning("Checkpoint offset %d > file size %d; rewinding to 0", offset, size)
                offset = 0
                write_checkpoint(checkpoint_path, offset)
        except FileNotFoundError:
            # файла еще нет — подождем ниже
            pass
        try:
            events, new_offset = tail_batch(file_path, offset, max_lines=batch_size - len(buffer) if batch_size > len(buffer) else 0)
        except FileNotFoundError:
            events, new_offset = [], offset
        except Exception:
            logger.exception("Error while reading file; will retry")
            events, new_offset = [], offset

        if events:
            buffer.extend(events)
            offset = new_offset

        now = time.time()
        should_flush = False
        if len(buffer) >= batch_size:
            should_flush = True
        elif (now - last_flush) >= flush_interval and len(buffer) > 0:
            should_flush = True

        if should_flush:
            # attempt to ship
            ok = ship_batch(ml_url, buffer)
            if ok:
                # move checkpoint forward and clear buffer
                write_checkpoint(checkpoint_path, offset)
                logger.info("Wrote checkpoint offset=%d", offset)
                buffer = []
                last_flush = time.time()
            else:
                # shipping failed permanently for this batch: wait and retry later; do not update checkpoint
                logger.warning("Shipping failed; will retry after delay")
                time.sleep(1.0)

        # if no events and file not growing, sleep
        if not events:
            time.sleep(poll_interval)

def main():
    ap = argparse.ArgumentParser(description="Ship normalized JSONL events to ML /score endpoint with checkpointing")
    ap.add_argument("--file", "-f", default="normalized.jsonl", help="JSONL input file (one JSON per line)")
    ap.add_argument("--ml", default="http://localhost:8001/score", help="ML scorer URL")
    ap.add_argument("--checkpoint", "-c", default=DEFAULT_CHECKPOINT, help="Checkpoint file path")
    ap.add_argument("--batch", type=int, default=200, help="Batch size (max events to send)")
    ap.add_argument("--flush-interval", type=float, default=0.5, help="Max seconds to wait before flushing a non-empty batch")
    ap.add_argument("--poll-interval", type=float, default=0.5, help="Poll interval when no new lines")
    args = ap.parse_args()

    try:
        run_loop(args.file, args.ml, args.checkpoint, args.batch, args.flush_interval, args.poll_interval)
    except KeyboardInterrupt:
        logger.info("Interrupted by user, exiting")

if __name__ == "__main__":
    main()
