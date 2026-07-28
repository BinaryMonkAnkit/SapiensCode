"""
In-memory token bucket rate limiter for WebSocket connections and execution requests.
"""

import time
from typing import Dict, Tuple


class ConnectionRateLimiter:
    """
    Limits requests per client IP address using a token bucket algorithm.
    """

    def __init__(self, requests_per_minute: int = 10, burst_limit: int = 3):
        self.rate = requests_per_minute / 60.0  # Tokens added per second
        self.capacity = burst_limit
        # Stores client_ip -> (tokens, last_updated_timestamp)
        self.buckets: Dict[str, Tuple[float, float]] = {}

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        tokens, last_updated = self.buckets.get(client_ip, (self.capacity, now))

        # Replenish tokens based on elapsed time
        elapsed = now - last_updated
        tokens = min(self.capacity, tokens + elapsed * self.rate)

        if tokens >= 1.0:
            tokens -= 1.0
            self.buckets[client_ip] = (tokens, now)
            return True

        # Update last checked timestamp even if rejected
        self.buckets[client_ip] = (tokens, now)
        return False


# Global Rate Limiter Instance (10 execution triggers per minute, max burst of 3)
execution_rate_limiter = ConnectionRateLimiter(requests_per_minute=10, burst_limit=3)