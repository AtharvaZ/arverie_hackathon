import time
from collections import defaultdict, deque


class SlidingWindowRateLimiter:
    """Simple in-memory sliding-window limiter keyed by arbitrary strings."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, float]:
        now = time.time()
        floor = now - window_seconds
        q = self._events[key]
        while q and q[0] < floor:
            q.popleft()

        if len(q) >= limit:
            retry_after = max(0.0, q[0] + window_seconds - now)
            return False, retry_after

        q.append(now)
        return True, 0.0