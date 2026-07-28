from app.code_execution.services.docker_runner import cleanup_workspace
import asyncio
from app.code_execution.services.core.concurrency import run_slots
from fastapi import WebSocket


async def stream_stdout(websocket: WebSocket, process: asyncio.subprocess.Process, state: dict,
                         container_name: str, host_dir: str) -> None:
    """Streams the container's output live, and is the single place
    responsible for releasing this run's concurrency slot and deleting its
    workspace once the container has actually exited."""
    try:
        while True:
            chunk = await process.stdout.read(256)
            if not chunk:
                break
            await websocket.send_json({"type": "stdout", "data": chunk.decode(errors="replace")})
    except Exception as exc:
        print(f"[stream error] {container_name}: {exc}")
    finally:
        returncode = await process.wait()

        # Only clear the connection's shared state if a newer run hasn't
        # already replaced it (can happen if the client started a second
        # run right after killing this one).
        if state.get("process") is process:
            state["process"] = None
            state["container_name"] = None
            state["host_dir"] = None

        cleanup_workspace(host_dir)
        await run_slots.release()

        try:
            await websocket.send_json({"type": "exit", "code": returncode})
        except Exception:
            pass

