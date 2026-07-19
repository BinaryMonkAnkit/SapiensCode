"""
Production-grade backend: runs submitted code inside a fresh, locked-down
Docker container per run, instead of running the interpreter directly on
the host. The WebSocket protocol is unchanged from the earlier version, so
Terminal.jsx / CodeEditor.jsx don't need any changes.

Run with:
    pip install -r requirements.txt --break-system-packages
    uvicorn main:app --port 8000
(don't use --reload here: this backend spawns and tracks docker processes;
the reload supervisor restarting the app mid-run would orphan them)

Requirements on the host running this backend:
  - Docker installed and running
  - The sandbox image built: docker build -t sandbox-runner:latest .
  - This backend's OS user must have permission to talk to the Docker
    daemon (on Linux, be in the "docker" group; Docker Desktop on
    Windows/Mac usually handles this automatically)

WebSocket: ws://localhost:8000/ws/terminal

Message types the frontend can send:
    {"type": "keystroke", "char": "a"}
    {"type": "command", "line": "help"}
    {"type": "run_code", "code": "...", "language": "py"}
    {"type": "stdin", "line": "Alice"}
    {"type": "stop"}

Message types the backend sends back:
    {"type": "ack", "char": "a"}
    {"type": "result", "line": "...", "output": "..."}
    {"type": "stdout", "data": "..."}
    {"type": "exit", "code": 0}
    {"type": "error", "detail": "..."}

CONCURRENCY MODEL:
  - Each WebSocket connection has its own `state` dict (a local variable
    per connection, same as before), so two clients never share a
    container, a workspace directory, or an stdin/stdout stream.
  - A single asyncio-based RunSlotManager caps how many containers can be
    running across ALL connections at once, so no burst of simultaneous
    users can exhaust the host's memory/CPU. Once the cap is hit, new
    run_code requests get an immediate "server is at capacity" error
    instead of queueing silently or overloading the machine.
  - Only the task that actually observes a container's stdout reach EOF
    (stream_stdout) releases that run's concurrency slot and deletes its
    workspace directory. "stop", a client disconnecting, and the runtime
    watchdog all just trigger `docker kill` on the right container by
    name; they never touch the slot count or the filesystem themselves.
    This avoids double-releasing a slot or double-deleting a directory
    from two different places.
"""



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.health import router as health_router
from app.api.terminal_ws import router as terminal_router
from app.api.assistant_api import router as assistant_router




app = FastAPI(title="Docker Code Execution Backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(terminal_router)
app.include_router(assistant_router)




