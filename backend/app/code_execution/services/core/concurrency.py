"""
Thread-safe, non-blocking concurrency limiter for sandboxed execution containers.
"""

import os
import asyncio
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# Fallback default if environment variable is missing or invalid
DEFAULT_MAX_CONCURRENT_RUNS = 10


def _get_max_concurrent_runs() -> int:
    raw_val = os.getenv("MAX_CONCURRENT_RUNS")
    if not raw_val:
        return DEFAULT_MAX_CONCURRENT_RUNS
    try:
        parsed = int(raw_val)
        return max(1, parsed)
    except ValueError:
        print(f"[Concurrency Warning] Invalid MAX_CONCURRENT_RUNS value '{raw_val}'. Defaulting to {DEFAULT_MAX_CONCURRENT_RUNS}.")
        return DEFAULT_MAX_CONCURRENT_RUNS


class RunSlotManager:
    """
    Race-free, non-blocking concurrency capacity tracker.

    Allows fast rejection when capacity is saturated rather than unbounded queueing.
    """

    def __init__(self, max_concurrent: int):
        self._max = max_concurrent
        self._current = 0
        self._lock = asyncio.Lock()

    @property
    def active_slots(self) -> int:
        """Returns the current number of in-flight execution slots."""
        return self._current

    @property
    def available_slots(self) -> int:
        """Returns the remaining capacity."""
        return max(0, self._max - self._current)

    async def try_acquire(self) -> bool:
        """
        Attempts to acquire an execution slot immediately without blocking.

        Returns True if acquired, False if capacity is full.
        """
        async with self._lock:
            if self._current >= self._max:
                return False
            self._current += 1
            return True

    async def release(self) -> None:
        """
        Releases an acquired execution slot. Guaranteed non-negative.
        """
        async with self._lock:
            self._current = max(0, self._current - 1)

    @asynccontextmanager
    async def acquire_slot(self) -> AsyncGenerator[bool, None]:
        """
        Context manager for acquiring and automatically releasing a slot.

        Yields True if slot was acquired, False if capacity was reached.
        """
        acquired = await self.try_acquire()
        try:
            yield acquired
        finally:
            if acquired:
                await self.release()


# Global Singleton Manager Instance
MAX_CONCURRENT_RUNS = _get_max_concurrent_runs()
run_slots = RunSlotManager(MAX_CONCURRENT_RUNS)