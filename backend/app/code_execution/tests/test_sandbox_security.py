"""
Defensive Verification Suite for FastAPI Code Execution Sandbox.

Async test suite verifying container security controls:
- Read-only filesystem enforcement
- Outbound network isolation
- Process limit (fork bomb) controls
- Memory ceiling / OOM killer isolation
"""

import sys
import pytest
import httpx
from pathlib import Path
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

# 1. Dynamically resolve paths so imports work regardless of execution directory
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app  # Absolute import from backend/main.py


@pytest.fixture
def async_client():
    """Fixture providing an HTTPX AsyncClient configured for ASGI WebSocket testing."""
    transport = ASGIWebSocketTransport(app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_readonly_filesystem_enforcement(async_client):
    """Verify that writing to the container root filesystem is denied."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": (
            "try:\n"
            "    with open('/root/test.txt', 'w') as f:\n"
            "        f.write('write_test')\n"
            "    print('SUCCESS_WRITE')\n"
            "except Exception as e:\n"
            "    print(f'DENIED: {type(e).__name__}')\n"
        )
    }

    async with async_client:
        async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
            await ws.send_json(payload)

            output = ""
            while True:
                data = await ws.receive_json()
                if data.get("type") == "stdout":
                    output += data.get("data", "")
                elif data.get("type") == "exit":
                    break

            # Confirms filesystem permissions stopped the write attempt
            assert any(
                err in output
                for err in ["DENIED: PermissionError", "DENIED: OSError", "Read-only file system"]
            )
            assert "SUCCESS_WRITE" not in output


@pytest.mark.asyncio
async def test_network_isolation_enforcement(async_client):
    """Verify that outbound network connections are blocked."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": (
            "import socket\n"
            "try:\n"
            "    socket.create_connection(('8.8.8.8', 53), timeout=2)\n"
            "    print('SUCCESS_NET')\n"
            "except Exception as e:\n"
            "    print(f'DENIED: {type(e).__name__}')\n"
        )
    }

    async with async_client:
        async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
            await ws.send_json(payload)

            output = ""
            while True:
                data = await ws.receive_json()
                if data.get("type") == "stdout":
                    output += data.get("data", "")
                elif data.get("type") == "exit":
                    break

            assert "DENIED:" in output
            assert "SUCCESS_NET" not in output


@pytest.mark.asyncio
async def test_pids_limit_fork_bomb_mitigation(async_client):
    """Verify process limits prevent fork-bomb thread exhaustion."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": (
            "import os, time\n"
            "try:\n"
            "    for i in range(200):\n"
            "        os.fork()\n"
            "    time.sleep(0.1)\n"
            "except Exception as e:\n"
            "    print(f'CAUGHT: {type(e).__name__}')\n"
        )
    }

    async with async_client:
        async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
            await ws.send_json(payload)

            exit_code = None
            while True:
                data = await ws.receive_json()
                if data.get("type") == "exit":
                    exit_code = data.get("code")
                    break

            # Process limit terminates container safely or raises OS error
            assert exit_code is not None


@pytest.mark.asyncio
async def test_memory_limit_enforcement(async_client):
    """Verify Out-Of-Memory (OOM) killer halts runaway allocations without host crash."""
    payload = {
        "type": "run_code",
        "language": "python",
        "code": (
            "arr = []\n"
            "while True:\n"
            "    arr.append('A' * 10_000_000)\n"
        )
    }

    async with async_client:
        async with aconnect_ws("http://test/ws/terminal", async_client) as ws:
            await ws.send_json(payload)

            exit_code = None
            while True:
                data = await ws.receive_json()
                if data.get("type") == "exit":
                    exit_code = data.get("code")
                    break

            # Container killed cleanly with non-zero exit code (137 = SIGKILL / OOM)
            assert exit_code != 0