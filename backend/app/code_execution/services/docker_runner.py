"""
Everything related to executing code inside an isolated, throwaway Docker sandbox.

One run = one temp directory on the host (mounted into the container) + one
uniquely named ephemeral container.
"""

import asyncio
import os
import shlex
import shutil
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncGenerator, List, Optional
import contextlib

from ..schemas.languages import LanguageConfig

IMAGE_NAME = "sandbox-runner:latest"
CONTAINER_WORKDIR = "/workspace"
CONTAINER_USER = "10000:10000"  # UID:GID matching our sandbox non-root user

# Global fallback caps
DEFAULT_CPU_LIMIT = "0.5"  # Cap at 50% single-core CPU
DEFAULT_PIDS_LIMIT = "64"  # Prevent thread/fork bombs


@dataclass
class PreparedRun:
    run_id: str
    host_dir: str
    container_name: str
    shell_command: str
    max_memory_mb: int


def prepare_workspace(language_config: LanguageConfig, code: str) -> PreparedRun:
    """
    Creates isolated temporary workspace directory on host and computes
    execution shell string for inside the sandbox.
    """
    run_id = uuid.uuid4().hex[:12]
    host_dir = tempfile.mkdtemp(prefix=f"sandbox-run-{run_id}-")

    # Grant ownership/permissions strictly to sandbox execution user (UID 10000)
    try:
        os.chown(host_dir, 10000, 10000)
        os.chmod(host_dir, 0o700)
    except (PermissionError, AttributeError):
        # Fallback for environments where non-root process owns temp files
        os.chmod(host_dir, 0o777)

    code_path = Path(host_dir) / language_config.filename
    code_path.write_text(code, encoding="utf-8")

    # Re-grant script file access to sandbox runner user
    try:
        os.chown(code_path, 10000, 10000)
    except (PermissionError, AttributeError):
        pass

    build_cmd = language_config.build_cmd
    run_cmd = language_config.run_cmd

    if build_cmd:
        shell_command = f"{shlex.join(build_cmd)} && {shlex.join(run_cmd)}"
    else:
        shell_command = shlex.join(run_cmd)

    container_name = f"sandbox-{run_id}"
    return PreparedRun(
        run_id=run_id,
        host_dir=host_dir,
        container_name=container_name,
        shell_command=shell_command,
        max_memory_mb=language_config.max_memory_mb,
    )


def build_docker_args(prepared: PreparedRun) -> List[str]:
    """
    Constructs the `docker run` command array with strict defense-in-depth security flags.
    """
    memory_limit_str = f"{prepared.max_memory_mb}m"

    return [
        "docker", "run",
        "--rm",                                     # Clean container up upon exit
        "-i",                                       # Keep standard input open
        "--name", prepared.container_name,
        "--network", "none",                        # Disable network access entirely
        "--memory", memory_limit_str,
        "--memory-swap", memory_limit_str,           # Disable virtual memory swapping
        "--cpus", DEFAULT_CPU_LIMIT,
        "--pids-limit", DEFAULT_PIDS_LIMIT,          # Fork-bomb protection
        "--cap-drop", "ALL",                        # Strip Linux capabilities
        "--security-opt", "no-new-privileges:true",  # Prevent privilege escalation
        "--read-only",                              # Root filesystem mounted read-only
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",# Minimal temporary in-memory space
        "-v", f"{prepared.host_dir}:{CONTAINER_WORKDIR}:rw",
        "-w", CONTAINER_WORKDIR,
        "-u", CONTAINER_USER,
        IMAGE_NAME,
        "sh", "-c", prepared.shell_command,
    ]


async def kill_container(container_name: str) -> None:
    """
    Forces immediate termination of running sandbox container.
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "rm", "-f", container_name,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
    except Exception as exc:
        print(f"[docker cleanup warning] Failed to kill {container_name}: {exc}")


def cleanup_workspace(host_dir: str) -> None:
    """
    Safely purges temporary run files from host system.
    """
    if os.path.exists(host_dir):
        shutil.rmtree(host_dir, ignore_errors=True)


@contextlib.asynccontextmanager
async def execution_sandbox_context(
    language_config: LanguageConfig, code: str
) -> AsyncGenerator[PreparedRun, None]:
    """
    Context manager guaranteeing container & filesystem cleanup even if task fails or cancels.
    """
    prepared = prepare_workspace(language_config, code)
    try:
        yield prepared
    finally:
        await kill_container(prepared.container_name)
        cleanup_workspace(prepared.host_dir)