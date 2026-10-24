import time
import threading
from typing import Any, Optional, Dict, Tuple

class SimpleTTLCache:
    """Thread-safe in-memory cache with time-to-live expiration."""
    def __init__(self, default_ttl_seconds: int = 300):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if key in self._cache:
                expiry, val = self._cache[key]
                if now < expiry:
                    return val
                else:
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = time.time() + ttl
        with self._lock:
            self._cache[key] = (expiry, value)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

github_cache = SimpleTTLCache(default_ttl_seconds=300)
