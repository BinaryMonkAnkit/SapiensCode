# Online Code Editor with AI Assistance

A production-oriented FastAPI backend that powers a browser-based code editor. It combines two independent subsystems:

1. **Code Execution Engine** a WebSocket-driven, Docker-sandboxed multi-language code runner with strict resource and security controls.
2. **AI Chat Assistant** a LangGraph-orchestrated conversational assistant with streaming responses, session persistence, and automatic conversation summarization, backed by Groq and Google Gemini models.

Both subsystems are mounted as independent routers on a single FastAPI app and are designed to be safe to expose to untrusted end users.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Testing](#testing)
- [Manual Verification Checklist](#manual-verification-checklist)
- [Extending the Project](#extending-the-project)

---

## Architecture Overview

```
                        FastAPI App (main.py)
                                |
          ------------------------------------------------
          |                                                |
   /ws/terminal (WebSocket)                        /assistant (REST + SSE)
   app/code_execution/                              app/ai_chat/
          |                                                |
   execution_service.py                             assistant.py (LangGraph)
          |                                                |
   docker_runner.py  --->  ephemeral Docker container  init_chat_model
          |                 (network:none, capped        (Groq / Gemini)
   rate_limiter.py           memory/cpu/pids)                    |
   concurrency.py                                    AsyncSqliteSaver
                                                       (per-session state)
```

- **Code execution** requests arrive over a WebSocket connection. Each run gets its own temporary host directory and a throwaway Docker container that is destroyed immediately after the run (or on timeout / disconnect).
- **AI chat** requests arrive over a REST endpoint and stream back a Server-Sent Events (SSE) response. Conversation state (messages, rolling summary, code context) is persisted per `session_id` using a SQLite-backed LangGraph checkpointer.

---

## Project Structure

```
backend/
  app/
    ai_chat/
      router.py                     # /assistant REST + SSE endpoints
      services/
        assistant.py                # LangGraph state machine, nodes, edges
        core/
          config.py                 # Pydantic Settings: models, limits, DB path
          exception.py
          security.py
        schemas/
          chat.py                   # ChatPayload validation
        utils/
          context_managers.py
      tests/
        test_assistant_logic.py
        test_router_stream.py
        test_schemas.py

    code_execution/
      router.py                     # /ws/terminal WebSocket endpoint
      sandbox/
        Dockerfile                  # Multi-language sandbox image
        docker-compose.sandbox.yml  # Builds & tags sandbox-runner:latest
      schemas/
        execution.py                # CodeExecutionRequest validation
        languages.py                # Per-language run/build configuration
      services/
        docker_runner.py            # Container prep, docker CLI args, cleanup
        execution_service.py        # Orchestrates a run end-to-end
        rate_limiter.py             # Per-IP token bucket
        core/
          concurrency.py            # Global concurrent-run slot manager
        handlers/
          command_handler.py        # Built-in virtual terminal commands
          stdout_stream_handler.py  # Streams container stdout over WS
      tests/
        test_app_readiness.py
        test_sandbox_security.py

  main.py                           # FastAPI app, CORS, router mounting
  requirements.txt
  Dockerfile                        # (legacy/commented reference image)
  audit_host_server.sh              # Host readiness/security audit script
  .env.example
```

---

## Features

### Code Execution

- **Multi-language support**: Python, JavaScript, Java, C, and C++ (see `schemas/languages.py`).
- **One-shot ephemeral containers**: every run gets a fresh container from the pre-built `sandbox-runner:latest` image; nothing is reused between runs.
- **Defense-in-depth container hardening**:
  - `--network none` (no outbound network access)
  - Memory and memory-swap caps per language
  - CPU share cap (default 0.5 core)
  - `--pids-limit` (fork-bomb protection)
  - `--cap-drop ALL` and `--security-opt no-new-privileges`
  - `--read-only` root filesystem with a small `noexec,nosuid` tmpfs
  - Fixed non-root UID:GID (`10000:10000`)
- **Runtime watchdog**: force-kills containers that exceed the configured timeout.
- **Concurrency capping**: a non-blocking, race-free slot manager rejects new runs immediately once the server is at capacity, rather than queuing indefinitely.
- **Per-IP rate limiting**: token-bucket limiter guards the `run_code` action against spamming.
- **Interactive stdin**: running programs can receive input live over the same WebSocket connection.
- **Built-in virtual terminal commands**: `help`, `time`, `echo`, `clear`, handled entirely in-process without touching Docker.
- **Guaranteed cleanup**: container termination and host-directory removal happen in `finally` blocks so failures, disconnects, and cancellations never leak resources.

### AI Chat Assistant

- **Multi-model support**: Groq-hosted models (GPT-OSS 120B, Qwen 3.6 Coder) and Google Gemini models (2.5 Pro, 3.5 Flash), selectable per request.
- **LangGraph state machine**: a two-node graph (`assistant` -> conditional `summarize_conversation`) with `AsyncSqliteSaver` checkpointing per `session_id`.
- **Rolling summarization**: once the message count exceeds `SUMMARIZE_THRESHOLD`, older messages are compressed into a running summary using a lightweight model, and the raw messages are pruned from state via `RemoveMessage`, while the most recent `RECENT_MESSAGES_TO_KEEP` messages stay intact.
- **Context-aware prompting**: the active code file and any selected text are sanitized, truncated, and injected into the system prompt alongside the running summary.
- **Streaming SSE responses**: token-level streaming via `astream_events`, normalized across Groq and Gemini response formats.
- **Friendly error mapping**: rate limits, context-length errors, and safety-filter blocks are caught and translated into clear, user-facing messages instead of raw stack traces.
- **Strict payload validation**: message length caps, control-character stripping, and a whitelist pattern for `session_id`.

---

## Prerequisites

- Python 3.11+
- Docker Engine (with permission for your OS user to talk to the daemon)
- API keys for at least one supported model provider (Groq and/or Google Gemini)

---

## Setup

### 1. Build the sandbox image

```bash
cd backend/app/code_execution/sandbox
docker compose -f docker-compose.sandbox.yml build
```

This produces the `sandbox-runner:latest` image containing Python, Node.js, a headless JDK, and gcc/g++, along with the fixed non-root `sandbox` user (UID/GID 10000) that every run executes as.

### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt --break-system-packages
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

---

## Environment Variables

| Variable                  | Description                                                         | Default                      |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| `MAX_RUNTIME_SECONDS`     | Max seconds a single code run may execute before being force-killed | `20`                         |
| `MAX_CONCURRENT_RUNS`     | Max containers running simultaneously across all connections        | `10`                         |
| `GROQ_API_KEY`            | API key for Groq-hosted models                                      | (required for Groq models)   |
| `GOOGLE_API_KEY`          | API key for Google Gemini models                                    | (required for Gemini models) |
| `DB_PATH`                 | SQLite file path for the LangGraph checkpointer                     | `chat_state.db`              |
| `MAX_MESSAGE_CHARS`       | Max characters allowed per user chat message                        | `8000`                       |
| `RECENT_MESSAGES_TO_KEEP` | Raw messages retained un-summarized in active context               | `6`                          |
| `SUMMARIZE_THRESHOLD`     | Message count that triggers summarization                           | `12`                         |

For production with multiple workers, replace the SQLite `DB_PATH` with a Postgres-backed LangGraph checkpointer, since SQLite is single-writer.

---

## Running the Server

```bash
cd backend
uvicorn main:app --port 8000
```

Avoid `--reload` in this backend: it tracks live Docker containers per WebSocket connection, and the reload supervisor restarting the process mid-run would orphan those containers.

A health check is available at:

```
GET /health -> {"status": "ok"}
```

---

## API Reference

### AI Assistant

#### `GET /assistant/models`

Returns the list of available models for a frontend dropdown.

```json
[
  {
    "id": "groq/gpt-oss-120b",
    "name": "GPT-OSS 120B (Groq Ultra-Fast Reasoning)"
  },
  {
    "id": "google/gemini-2.5-pro",
    "name": "Gemini 2.5 Pro (Deep Workspace Reasoning)"
  }
]
```

#### `POST /assistant/chat`

Streams a chat completion as Server-Sent Events.

Request body:

```json
{
  "message": "Explain this function",
  "current_code": "def add(a, b): return a + b",
  "selected_text": "def add",
  "session_id": "session_abc123",
  "model_id": "groq/gpt-oss-120b"
}
```

Response: `text/event-stream`, one JSON payload per event:

```
data: {"content": "Hello"}
data: {"content": " world!"}
```

On failure, an error event is emitted instead:

```
data: {"error": "Free-tier API limit reached. Please switch models or wait a moment."}
```

`session_id` must match `^[a-zA-Z0-9_-]+$`; `model_id` must be one of the keys returned by `/assistant/models`.

### Code Execution

#### `WS /ws/terminal`

A single WebSocket connection multiplexes several message types.

**Client to server:**

| `type`     | Purpose                                     | Extra fields                           |
| ---------- | ------------------------------------------- | -------------------------------------- |
| `command`  | Run a built-in virtual terminal command     | `line`                                 |
| `run_code` | Execute code in a sandboxed container       | `language`, `code`, `stdin`, `timeout` |
| `stdin`    | Feed a line of input to the running process | `line`                                 |
| `stop`     | Kill the currently running container        |                                        |

**Server to client:**

| `type`   | Meaning                                          |
| -------- | ------------------------------------------------ |
| `result` | Output of a built-in command                     |
| `stdout` | A chunk of live program output                   |
| `exit`   | Process finished; includes `code`                |
| `status` | Informational message (e.g. stop acknowledgment) |
| `error`  | Validation, rate-limit, or runtime error         |

Supported `language` values (see `schemas/languages.py`): `py`/`python`, `js`/`javascript`, `java`, `c`, `cpp`/`c++`.

---

## Security Model

The code execution path assumes it may be exposed to untrusted, potentially adversarial input, and layers several independent controls:

1. **Input validation** every execution request is validated through `CodeExecutionRequest` (language whitelist, 50KB code cap, null-byte stripping, timeout bounds of 1 to 15 seconds).
2. **Per-IP rate limiting** a token-bucket limiter on the `run_code` action.
3. **Global concurrency cap** a race-free async slot manager that rejects excess runs immediately instead of queueing them.
4. **Container isolation**:
   - No network access (`--network none`)
   - Memory and CPU ceilings
   - Process count limits (fork-bomb mitigation)
   - All Linux capabilities dropped
   - `no-new-privileges` to block privilege escalation
   - Read-only root filesystem with a minimal `noexec,nosuid` tmpfs
   - Execution as a fixed, non-root, low-privilege user
5. **Runtime watchdog** any container that exceeds its timeout is forcibly killed.
6. **Guaranteed cleanup** containers and their temporary host directories are removed in `finally` blocks, covering normal completion, timeouts, and abrupt client disconnects.

The AI chat path is validated separately: message length limits, control-character sanitization, and a strict `session_id` character whitelist guard against malformed or malicious payloads before they ever reach a model provider.

An `audit_host_server.sh` script is included to sanity-check a deployment host: it verifies the FastAPI process isn't running as root, confirms Docker socket access, checks that the `sandbox-runner` image has been built, checks for WebSocket-compatible Nginx configuration, and confirms the runtime/concurrency environment variables are set.

---

## Testing

Run the full suite from the `backend` directory:

```bash
pytest
```

Notable test coverage:

- **`ai_chat/tests/`**: payload schema validation, the summarization routing condition, code-snippet truncation, and SSE streaming behavior (including simulated rate-limit errors) using mocked model responses.
- **`code_execution/tests/test_sandbox_security.py`**: verifies read-only filesystem enforcement, network isolation, fork-bomb (pids-limit) mitigation, and memory-limit (OOM) enforcement against real Docker containers.
- **`code_execution/tests/test_app_readiness.py`**: checks environment variable bounds, workspace cleanup after execution, and rate limiter enforcement under rapid requests.

Because the sandbox security tests spin up real containers, they require a working Docker daemon and the `sandbox-runner:latest` image to already be built.

---

## Manual Verification Checklist

Some guarantees depend on real kernel namespaces/cgroups and are best confirmed by hand on the target machine, in addition to the automated tests:

- [ ] Run a script that attempts an outbound network call and confirm it fails.
- [ ] Run an infinite loop and confirm the watchdog kills it around `MAX_RUNTIME_SECONDS`.
- [ ] Run a CPU/memory-heavy script and confirm usage stays within configured caps (`docker stats` while it runs).
- [ ] Start two runs from two different browser tabs simultaneously and confirm both execute independently (`docker ps` should show two distinct containers).
- [ ] Click Stop mid-run and confirm the container disappears from `docker ps`, not just that the UI stops showing output.

If any of these do not hold up, the relevant flags live in `app/code_execution/services/docker_runner.py`.

---

## Extending the Project

- **Add a language**: add an entry to `LANGUAGE_CONFIGS` and `LANGUAGE_ALIASES` in `app/code_execution/schemas/languages.py`, and make sure the runtime/compiler is installed in the sandbox `Dockerfile`.
- **Add a model provider**: add an entry to `AVAILABLE_MODELS` in `app/ai_chat/services/core/config.py` with the appropriate `provider`, `model_id`, and token limit; `get_model_instance` already dispatches on `provider` to select the right API key.
- **Swap the checkpointer for production**: replace `AsyncSqliteSaver` in `app/ai_chat/services/assistant.py` and `router.py` with a Postgres-backed LangGraph checkpointer to support multiple worker processes.
- **Add a built-in terminal command**: register a new handler function in `COMMAND_REGISTRY` inside `app/code_execution/services/handlers/command_handler.py`.
