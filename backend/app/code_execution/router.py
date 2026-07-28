"""
WebSocket router exposing terminal shell commands and live code streaming.
Integrates per-IP rate limiting, non-blocking concurrency management,
and isolated execution sandbox contexts.
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .schemas.languages import supported_languages_summary
from .services.handlers.command_handler import handle_command
from .services.handlers.stdout_stream_handler import stream_stdout
from .services.execution_service import execute_code_payload, watchdog
from .services.docker_runner import kill_container
from .services.rate_limiter import execution_rate_limiter

router = APIRouter(prefix="/ws", tags=["Sandbox Terminal"])


@router.websocket("/terminal")
async def terminal_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    client = websocket.client
    client_ip = client.host if client else "unknown"

    # Per-connection state tracker (isolated per WebSocket session)
    state: dict = {"process": None, "container_name": None, "host_dir": None}

    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")

            try:
                # --- COMMAND TYPE: Utility Terminal Commands ---
                if msg_type == "command":
                    line = payload.get("line", "")
                    cmd_result = handle_command(line)
                    await websocket.send_json(
                        {
                            "type": "result",
                            "line": line,
                            "output": cmd_result["output"],
                            "action": cmd_result.get("action"),
                        }
                    )

                # --- COMMAND TYPE: Code Execution Request ---
                elif msg_type == "run_code":
                    # 1. Per-IP Rate Limiting Check
                    if not execution_rate_limiter.is_allowed(client_ip):
                        await websocket.send_json(
                            {
                                "type": "error",
                                "detail": "Rate limit exceeded. Please wait before running more code.",
                            }
                        )
                        continue

                    # 2. Schema Validation & Container Preparation
                    res = await execute_code_payload(payload, state)

                    if not res["success"]:
                        await websocket.send_json({"type": "error", "detail": res["error"]})
                        continue

                    process = res["process"]
                    prepared = res["prepared"]
                    timeout = res["timeout"]

                    # 3. Stream output and attach timeout watchdog
                    asyncio.create_task(
                        stream_stdout(
                            websocket,
                            process,
                            state,
                            prepared.container_name,
                            prepared.host_dir,
                        )
                    )
                    asyncio.create_task(watchdog(process, prepared.container_name, timeout))

                # --- COMMAND TYPE: Interactive STDIN Feed ---
                elif msg_type == "stdin":
                    process = state.get("process")
                    if process and process.returncode is None and process.stdin:
                        line = payload.get("line", "")
                        try:
                            process.stdin.write((line + "\n").encode("utf-8"))
                            await process.stdin.drain()
                        except (BrokenPipeError, ConnectionResetError):
                            await websocket.send_json(
                                {
                                    "type": "error",
                                    "detail": "Target process has exited or closed stdin.",
                                }
                            )
                    else:
                        await websocket.send_json(
                            {"type": "error", "detail": "No active program is accepting input."}
                        )

                # --- COMMAND TYPE: Stop Running Process ---
                elif msg_type == "stop":
                    container_name = state.get("container_name")
                    if container_name:
                        await kill_container(container_name)
                        await websocket.send_json(
                            {"type": "status", "detail": "Execution stopped by user."}
                        )

                # --- UNKNOWN PAYLOAD ---
                else:
                    await websocket.send_json(
                        {"type": "error", "detail": f"Unknown action frame: '{msg_type}'"}
                    )

            except Exception as exc:
                print(f"[WebSocket Loop Error] Client {client_ip}: {exc}")
                await websocket.send_json(
                    {"type": "error", "detail": f"Internal process error: {exc}"}
                )

    except WebSocketDisconnect:
        # Guarantee container cleanup if the client closes the tab mid-execution
        container_name = state.get("container_name")
        if container_name:
            await kill_container(container_name)