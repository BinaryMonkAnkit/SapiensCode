"""
Live streaming handler for standard execution output and lifecycle cleanup.
"""

import asyncio
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

from ..docker_runner import cleanup_workspace
from ..core.concurrency import run_slots

# Maximum allowed stdout buffer per execution to prevent client/server memory exhaustion (1MB)
MAX_TOTAL_OUTPUT_BYTES = 1024 * 1024


async def stream_stdout(
    websocket: WebSocket,
    process: asyncio.subprocess.Process,
    state: Dict[str, Any],
    container_name: str,
    host_dir: str,
) -> None:
    """
    Streams sub-process stdout output frame-by-frame over WebSocket.
    Guarantees concurrency slot release and directory cleanup upon completion or failure.
    """
    total_bytes_sent = 0
    buffer_exceeded = False

    try:
        if process.stdout:
            while True:
                chunk = await process.stdout.read(512)
                if not chunk:
                    break

                total_bytes_sent += len(chunk)

                if total_bytes_sent > MAX_TOTAL_OUTPUT_BYTES:
                    if not buffer_exceeded:
                        buffer_exceeded = True
                        await websocket.send_json(
                            {
                                "type": "stdout",
                                "data": "\n\n[System Alert: Output threshold exceeded (1MB limit). Truncating output...]\n",
                            }
                        )
                    continue

                decoded_chunk = chunk.decode(errors="replace")
                await websocket.send_json({"type": "stdout", "data": decoded_chunk})

    except (WebSocketDisconnect, RuntimeError):
        # Client closed websocket or connection reset during write operation
        pass
    except Exception as exc:
        print(f"[stream_stdout error] Container '{container_name}': {exc}")
    finally:
        # Await process exit code safely
        returncode = await process.wait() if process else -1

        # Clear state references atomically if this process was active
        if state.get("process") is process:
            state["process"] = None
            state["container_name"] = None
            state["host_dir"] = None

        # Perform filesystem cleanup asynchronously to avoid blocking event loop
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, cleanup_workspace, host_dir)

        # Always release global execution slot
        await run_slots.release()

        # Send final execution status frame if connection remains alive
        try:
            await websocket.send_json({"type": "exit", "code": returncode})
        except Exception:
            pass