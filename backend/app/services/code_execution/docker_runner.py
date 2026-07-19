"""
Everything related to actually running submitted code inside a throwaway,
locked-down Docker container.

One run = one temp directory on the host (bind-mounted into the container)
+ one uniquely-named container. Nothing about a run is shared with any
other run, on this connection or any other, so many clients running code
at the same time never touch each other's filesystem, process, or output.
"""

import asyncio
import os
import shlex
import shutil
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path

IMAGE_NAME = "sandbox-runner:latest"
CONTAINER_WORKDIR = "/workspace"
CONTAINER_USER = "sandbox"

# Resource limits applied to every single run, regardless of language.
MEMORY_LIMIT = "256m"
CPU_LIMIT = "1.0"
PIDS_LIMIT = "128"


@dataclass
class PreparedRun:
    run_id: str
    host_dir: str
    container_name: str
    shell_command: str


def prepare_workspace(language_config: dict, code: str) -> PreparedRun:
    """Writes the submitted code to a fresh, isolated temp directory and
    works out the single shell command (build + run, or just run) that will
    execute inside the container."""
    run_id = uuid.uuid4().hex[:12]
    host_dir = tempfile.mkdtemp(prefix=f"sandbox-run-{run_id}-")

    # The container runs as a fixed non-root user whose uid almost
    # certainly doesn't match whatever user this backend runs as on the
    # host, so the mounted directory needs to be writable by anyone. This
    # is safe here specifically because the directory is single-use,
    # contains only this one run's source/compiled output, has no network
    # access from inside the container, and is deleted immediately after
    # the run finishes.
    os.chmod(host_dir, 0o777)

    code_path = Path(host_dir) / language_config["filename"]
    code_path.write_text(code)

    build_cmd = language_config.get("build_cmd")
    run_cmd = language_config["run_cmd"]

    if build_cmd:
        shell_command = f"{shlex.join(build_cmd)} && {shlex.join(run_cmd)}"
    else:
        shell_command = shlex.join(run_cmd)

    container_name = f"sandbox-{run_id}"
    return PreparedRun(run_id=run_id, host_dir=host_dir, container_name=container_name, shell_command=shell_command)


def build_docker_args(prepared: PreparedRun) -> list:
    """The actual `docker run ...` argv, with every safety flag we want
    applied to every run, no exceptions."""
    return [
        "docker", "run",
        "--rm",                              # remove the container as soon as it exits
        "-i",                                 # keep stdin open for interactive input, no pty
        "--name", prepared.container_name,
        "--network", "none",                  # no network access at all for submitted code
        "--memory", MEMORY_LIMIT,
        "--memory-swap", MEMORY_LIMIT,        # prevent swap from working around the memory cap
        "--cpus", CPU_LIMIT,
        "--pids-limit", PIDS_LIMIT,           # fork-bomb protection
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "-v", f"{prepared.host_dir}:{CONTAINER_WORKDIR}:rw",
        "-w", CONTAINER_WORKDIR,
        "-u", CONTAINER_USER,
        IMAGE_NAME,
        "sh", "-c", prepared.shell_command,
    ]


async def kill_container(name: str) -> None:
    """Best-effort kill. The container may already have exited on its own,
    so a non-zero result here just means there was nothing left to kill."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "kill", name,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
    except Exception as exc:
        print(f"[docker kill error] {name}: {exc}")


def cleanup_workspace(host_dir: str) -> None:
    shutil.rmtree(host_dir, ignore_errors=True)