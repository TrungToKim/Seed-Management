import time
import threading

_lock = threading.Lock()
_windows = {}
_daily = {}

MINUTE_WINDOW = 60


def check_rate_limit(key: str, limit: int, window_seconds: int = MINUTE_WINDOW) -> bool:
    """Sliding-window limiter. Returns True if the request is allowed.

    A limit of 0 means unlimited.
    """
    if limit <= 0:
        return True
    now = time.time()
    cutoff = now - window_seconds
    with _lock:
        ts = _windows.setdefault(key, [])
        if ts:
            ts[:] = [t for t in ts if t > cutoff]
        if len(ts) >= limit:
            return False
        ts.append(now)
        return True


def check_daily_limit(key: str, limit: int) -> bool:
    """Calendar-day counter. Returns True if the request is allowed.

    A limit of 0 means unlimited.
    """
    if limit <= 0:
        return True
    day = time.strftime("%Y-%m-%d")
    with _lock:
        entry = _daily.setdefault(key, {"date": day, "count": 0})
        if entry["date"] != day:
            entry["date"] = day
            entry["count"] = 0
        if entry["count"] >= limit:
            return False
        entry["count"] += 1
        return True