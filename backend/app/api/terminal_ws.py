import asyncio
import os
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.code_execution.docker_runner import build_docker_args, cleanup_workspace, kill_container, prepare_workspace
from app.services.code_execution.schemas.languages import LANGUAGES, supported_languages_summary
from app.services.code_execution.core.concurrency import run_slots
from app.services.code_execution.handlers.command_handler import handle_command
from app.services.code_execution.handlers.stdout_stream_handler import stream_stdout

# load environment variables
load_dotenv()

router = APIRouter()

MAX_RUNTIME_SECONDS = int(os.getenv("MAX_RUNTIME_SECONDS"))


async def watchdog(process: asyncio.subprocess.Process, container_name: str,
                    timeout: int = MAX_RUNTIME_SECONDS) -> None:
    """Kills the container if it runs longer than the allowed timeout.
    Cleanup itself still happens in stream_stdout once the kill takes
    effect and the process actually exits."""
    try:
        await asyncio.wait_for(process.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"[watchdog] killing runaway container {container_name} after {timeout}s")
        await kill_container(container_name)




@router.websocket("/ws/terminal")
async def terminal_socket(websocket: WebSocket):
    await websocket.accept()
    client = websocket.client
    print(f"[connected] {client}")

    # Per-connection state. Never shared with any other connection.
    state = {"process": None, "container_name": None, "host_dir": None}

    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")

            try:
                # if msg_type == "keystroke":
                #     char = payload.get("char", "")
                #     await websocket.send_json({"type": "ack", "char": char})

                if msg_type == "command":
                    line = payload.get("line", "")
                    result = handle_command(line)
                    await websocket.send_json({"type": "result", "line": line, "output": result})

                elif msg_type == "run_code":
                    code = payload.get("code", "")
                    language = payload.get("language", "py")

                    lang_config = LANGUAGES.get(language)
                    if lang_config is None:
                        await websocket.send_json({
                            "type": "error",
                            "detail": f"language '{language}' is not supported "
                                      f"(supported: {supported_languages_summary()})",
                        })
                        continue

                    # If this connection already has something running,
                    # kill it. Its own stream_stdout task will notice the
                    # exit shortly and release its slot/workspace itself.
                    old_container = state.get("container_name")
                    if old_container:
                        await kill_container(old_container)

                    acquired = await run_slots.try_acquire()
                    if not acquired:
                        await websocket.send_json({
                            "type": "error",
                            "detail": "server is at capacity, please try again shortly",
                        })
                        continue

                    try:
                        prepared = prepare_workspace(lang_config, code)
                    except Exception as exc:
                        await run_slots.release()
                        await websocket.send_json({"type": "error", "detail": f"failed to prepare workspace: {exc}"})
                        continue

                    docker_args = build_docker_args(prepared)
                    print(f"[run_code] {client} starting container {prepared.container_name} ({language})")

                    try:
                        process = await asyncio.create_subprocess_exec(
                            *docker_args,
                            stdin=asyncio.subprocess.PIPE,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.STDOUT,
                        )
                    except FileNotFoundError as exc:
                        await run_slots.release()
                        cleanup_workspace(prepared.host_dir)
                        await websocket.send_json({"type": "error", "detail": f"couldn't start docker: {exc}"})
                        continue

                    state["process"] = process
                    state["container_name"] = prepared.container_name
                    state["host_dir"] = prepared.host_dir

                    asyncio.create_task(
                        stream_stdout(websocket, process, state, prepared.container_name, prepared.host_dir)
                    )
                    asyncio.create_task(watchdog(process, prepared.container_name))

                elif msg_type == "stdin":
                    process = state.get("process")
                    if process and process.returncode is None:
                        line = payload.get("line", "")
                        process.stdin.write((line + "\n").encode())
                        await process.stdin.drain()
                    else:
                        await websocket.send_json({"type": "error", "detail": "no program is currently running"})

                elif msg_type == "stop":
                    container_name = state.get("container_name")
                    if container_name:
                        await kill_container(container_name)

                else:
                    await websocket.send_json({"type": "error", "detail": f"unknown message type: {msg_type}"})

            except Exception as exc:
                # One malformed message or unexpected error should not take
                # the whole connection down.
                print(f"[handler error] {client} -> {exc}")
                await websocket.send_json({"type": "error", "detail": f"internal error: {exc}"})

    except WebSocketDisconnect:
        print(f"[disconnected] {client}")
        container_name = state.get("container_name")
        if container_name:
            await kill_container(container_name)