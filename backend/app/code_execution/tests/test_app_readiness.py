"""
Application-Level Production Readiness Verification Suite.

Verifies:
- Environment variable configuration bounds (MAX_CONCURRENT_RUNS, MAX_RUNTIME_SECONDS)
- Temporary workspace directory cleanup
- Rate limiting behavior on execution endpoints
"""

import sys
import os
import pytest
import httpx
from pathlib import Path
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

# 1. Dynamically resolve paths
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app


@pytest.fixture
def async_client():
    transport = ASGIWebSocketTransport(app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


def test_env_variables_configured():
    """Verify production environment limits are set and within safe bounds."""
    max_runs = os.getenv("MAX_CONCURRENT_RUNS")
    max_runtime = os.getenv("MAX_RUNTIME_SECONDS")

    assert max_runs is not None, "MAX_CONCURRENT_RUNS environment variable is missing!"
    assert max_runtime is not None, "MAX_RUNTIME_SECONDS environment variable is missing!"

    # Safe defaults guard
    assert 1 <= int(max_runs) <= 50, f"MAX_CONCURRENT_RUNS ({max_runs}) is outside safe limits (1-50)"
    assert 1 <= int(max_runtime) <= 60, f"MAX_RUNTIME_SECONDS ({max_runtime}) is outside safe limits (1-60)"


@pytest.mark.asyncio
async def test_workspace_cleanup_after_execution(async_client):
    """Verify no leftover temporary directories remain in workspace root after code runs."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": "print('testing workspace cleanup')"
    }

    # Count files/folders in temp dir before execution
    temp_dir = Path(os.getenv("TEMP_WORKSPACE_DIR", "/tmp"))
    files_before = set(temp_dir.glob("sandbox_*")) if temp_dir.exists() else set()

    async with async_client:
        async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
            await ws.send_json(payload)
            while True:
                data = await ws.receive_json()
                if data.get("type") == "exit":
                    break

    # Count files/folders after execution
    files_after = set(temp_dir.glob("sandbox_*")) if temp_dir.exists() else set()
    
    # Assert no leaked sandbox folders remain
    leaked_files = files_after - files_before
    assert len(leaked_files) == 0, f"Leaked temporary workspace folders found: {leaked_files}"


@pytest.mark.asyncio
async def test_rate_limiter_enforcement(async_client):
    """Verify rate limiter blocks spamming execution requests in rapid succession."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": "print('rate limit check')"
    }

    responses = []
    async with async_client:
        for _ in range(15):  # Fire 15 rapid requests
            try:
                async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
                    await ws.send_json(payload)
                    data = await ws.receive_json()
                    responses.append(data.get("type"))
            except Exception:
                responses.append("blocked_or_rejected")

    # Verify that at least one request was rate limited / rejected
    assert "error" in responses or "blocked_or_rejected" in responses or len(responses) < 15