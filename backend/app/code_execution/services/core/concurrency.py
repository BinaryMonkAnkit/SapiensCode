import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

MAX_CONCURRENT_RUNS = int(os.getenv("MAX_CONCURRENT_RUNS"))

class RunSlotManager:
    """A simple, race-free concurrency cap. Deliberately not just an
    asyncio.Semaphore, since we need a non-blocking "is there room right
    now" check (to fail fast with a clear error) rather than queueing."""

    def __init__(self, max_concurrent: int):
        self._max = max_concurrent
        self._current = 0
        self._lock = asyncio.Lock()

    async def try_acquire(self) -> bool:
        async with self._lock:
            if self._current >= self._max:
                return False
            self._current += 1
            return True

    async def release(self) -> None:
        async with self._lock:
            self._current = max(0, self._current - 1)


run_slots = RunSlotManager(MAX_CONCURRENT_RUNS)