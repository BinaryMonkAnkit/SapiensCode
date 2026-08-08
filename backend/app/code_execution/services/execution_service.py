"""
Service layer orchestrating sandbox execution lifecycle, process bounds, and watchdog tasks.
"""

import asyncio
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import traceback
from ..schemas.languages import get_language_config, LanguageConfig
from ..schemas.execution import CodeExecutionRequest
from .docker_runner import prepare_workspace, build_docker_args, kill_container, cleanup_workspace
from .core.concurrency import run_slots

load_dotenv()

DEFAULT_TIMEOUT = int(os.getenv("MAX_RUNTIME_SECONDS", "10"))


async def watchdog(
    process: asyncio.subprocess.Process,
    container_name: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> None:
    """
    Monitors running sandbox containers and sends SIGKILL if timeout threshold is hit.
    """
    try:
        await asyncio.wait_for(process.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"[Watchdog] Killing runaway sandbox container '{container_name}' after {timeout}s")
        await kill_container(container_name)


async def execute_code_payload(
    payload: Dict[str, Any],
    state: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Validates input, acquires resources, prepares workspace, and launches the container process.

    Returns a dict containing either error status or initialized subprocess metadata.
    """
    # 1. Pydantic Payload Validation
    try:
        req = CodeExecutionRequest(**payload)
    except Exception as err:
        return {"success": False, "error": f"Invalid payload: {str(err)}"}

    lang_config = get_language_config(req.language)
    if not lang_config:
        return {"success": False, "error": f"Unsupported language '{req.language}'."}

    # 2. Terminate any previous execution owned by this client connection
    old_container = state.get("container_name")
    if old_container:
        await kill_container(old_container)

    # 3. Non-blocking Concurrency Check
    acquired = await run_slots.try_acquire()
    if not acquired:
        return {
            "success": False,
            "error": "Server is currently at capacity. Please try again shortly.",
        }

    # 4. Workspace & Disk Preparation
    try:
        prepared = prepare_workspace(lang_config, req.code)
    except Exception as exc:
        await run_slots.release()
        return {"success": False, "error": f"Failed to initialize workspace: {exc}"}

    docker_args = build_docker_args(prepared)

    # 5. Launch Subprocess
    try:
        process = await asyncio.create_subprocess_exec(
            *docker_args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
    except Exception as exc:
        await run_slots.release()
        cleanup_workspace(prepared.host_dir)
        print("[DEBUG] docker_args:", docker_args)
        print("[DEBUG] exception type:", type(exc).__name__)
        print("[DEBUG] exception repr:", repr(exc))
        print("[DEBUG] traceback:\n", traceback.format_exc())
        return {"success": False, "error": f"Container engine execution error: {exc}"}

    # Update active state bounds
    state["process"] = process
    state["container_name"] = prepared.container_name
    state["host_dir"] = prepared.host_dir

    return {
        "success": True,
        "process": process,
        "prepared": prepared,
        "timeout": req.timeout or DEFAULT_TIMEOUT,
    }