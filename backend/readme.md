# CodeEditor Project

## 1. Architechtural Design of the project

CodeIt/
├── main.py
├── api/
│ ├── http.py # REST endpoints
│ └── ws.py # WebSocket terminal
├── core/
│ ├── config.py
│ ├── registry.py # Execution registry
│ └── policies.py
├── execution/
│ ├── manager.py # Control plane
│ ├── resolver.py # WASM vs Firecracker
│ ├── base.py # Executor interface
│ ├── wasm/
│ │ ├── runtime.py
│ │ └── stdin.py
│ └── firecracker/
│ ├── executor.py
│ └── jail.py
├── streaming/
│ ├── mux.py
│ └── execution.py
│ └── buffers.py
|── models/
└── requirements.txt

## 2. Execution flow

Client
↓
api/http.py
↓
ExecutionManager
↓
Resolver
↓
WASM or Firecracker
↓
Executor.execute()
↓
StreamMux buffers output
↓
Manager.collect()
↓
JSON response returned

# Docker-based code execution backend

Same WebSocket protocol as before (`ws://localhost:8000/ws/terminal`), so
`Terminal.jsx` / `CodeEditor.jsx` need no changes. The difference is that
`run_code` now executes inside a fresh, locked-down Docker container
instead of running the interpreter directly on the host.

## 1. Build the sandbox image

```
cd docker-backend
docker build -t sandbox-runner:latest .
```

This installs Python, Node, a JDK, and gcc/g++ into one shared image, and
creates the fixed non-root `sandbox` user every run executes as.

## 2. Install backend dependencies and run it

```
cd app
pip install -r ../requirements.txt --break-system-packages
uvicorn main:app --port 8000
```

Don't use `--reload`: this backend tracks live Docker containers per
connection, and the reload supervisor restarting the process mid-run would
orphan them.

Your OS user needs permission to talk to the Docker daemon (on Linux,
being in the `docker` group is usually enough; Docker Desktop on
Windows/Mac handles this automatically).

## 3. What's actually enforced per run

Every container gets, no exceptions: `--network none` (no network access
at all), a memory cap, a CPU cap, a process-count limit (fork-bomb
protection), all Linux capabilities dropped, `no-new-privileges`, and a
fixed non-root user. On top of that, the backend force-kills any run that
exceeds `MAX_RUNTIME_SECONDS` (20s by default, see `main.py`), and caps how
many containers can run at once across all connections at
`MAX_CONCURRENT_RUNS` (10 by default).

## 4. Supported languages

Python and JavaScript run directly. Java, C, and C++ compile first, then
run, inside the same container. Java submissions must declare
`public class Main`, since the filename and run command both assume that.
See `app/languages.py` to add more.

## 5. Manually verifying it works

I built and tested the asyncio orchestration logic (concurrency cap,
`stop`, the runtime watchdog, cleanup) against a stand-in for Docker,
since this environment doesn't have a real Docker daemon available. I
could not verify the actual container isolation itself (the `--network
none`, resource limits, capability drops, and the fact that killing a
container's main process reliably tears down every process inside it) -
that part depends on real kernel namespaces/cgroups, so please check these
on your machine once the image is built:

- Run something that tries to access the network (e.g. a Python script
  fetching a URL) and confirm it fails.
- Run an infinite loop and confirm the runtime watchdog kills it around
  20 seconds.
- Run something CPU/memory-heavy and confirm the container's usage stays
  within the configured caps (`docker stats` while it runs).
- Start two runs from two different browser tabs at the same time and
  confirm both work independently (check `docker ps` for two distinct
  containers).
- Click Stop mid-run and confirm the container actually disappears from
  `docker ps`, not just that the UI stops showing output.

If any of those don't hold up, the limits/flags to adjust are all in
`app/docker_runner.py`.
