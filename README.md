# Modern AI Code Workspace

A full-stack, real-time code editor, AI-assisted workspace, and documentation browser. Designed with a sleek glassmorphism UI, this application features a sandbox execution environment for running untrusted code safely, a stateful streaming AI chat assistant, and an integrated documentation viewer.

---

## Architecture Overview

```
├── frontend/    # React + Vite frontend with Monaco Editor & streaming UI
└── backend/     # FastAPI + LangGraph server with Docker execution sandboxes

```

---

## Features

### 🗨️ AI Chat Assistant

* **Token-by-Token Streaming:** Real-time HTTP SSE streaming via `fetch` and `ReadableStream`.
* **Stateful Conversations:** Automatic sliding-window summarization powered by **LangGraph** state machines with persistent SQLite checkpointing.
* **Context-Aware:** Dynamically injects active editor code and selected text into system prompts.
* **Multi-Model Support:** Per-request model switching across Groq and Google Gemini models.
* **Rich Output & Controls:** GitHub-flavored Markdown rendering, syntax-highlighted code blocks with copy-to-clipboard, editable message history, and dynamic auto-scroll.
* **Voice Input:** Hands-free input integration utilizing the native Web Speech API.

### 💻 Live Code Editor & Interactive Terminal

* **Monaco Editor Integration:** Supports Python, JavaScript, Java, C, and C++ with custom glassmorphism light/dark themes and boilerplate starter templates.
* **Resizable Paneling:** Orientation-aware, flexible layout management (`react-resizable-panels`).
* **WebSocket Terminal:** Real-time bidirectional streaming for `stdout` and interactive `stdin`.
* **In-Process Commands:** Virtual terminal utilities (`help`, `time`, `echo`, `clear`) alongside execution handling.

### 📚 Integrated Documentation Browser

* **In-App Docs:** Embedded browser interface with dynamic loading overlays for language documentation (Python, JS, C, C++, Java).

### 🧭 Ambient Navigation

* **Glassmorphism UI:** Unified visual design with custom wheel/trackpad event handling to isolate scroll regions cleanly.
* **Quick Access Dock:** Navigation dock for seamless tab movement and global theme toggling.

---

## Tech Stack & Core Libraries

### Frontend

* **Framework & Build:** React (Hooks, Functional Components) + Vite
* **Styling:** Tailwind CSS, CSS Modules, CSS Custom Properties (Design Tokens)
* **Code Editor:** `@monaco-editor/react`
* **Layout & UI:** `react-resizable-panels`, `lucide-react`
* **Markdown & Code Display:** `react-markdown`, `remark-gfm`, `react-syntax-highlighter` (Atom One Dark/Light)
* **Realtime Communication:** WebSockets (Terminal execution), Native Fetch API / `ReadableStream` (AI Streaming)
* **Speech Processing:** Web Speech API (`SpeechRecognition`)

### Backend

* **Server Framework:** FastAPI
* **Orchestration & State:** LangGraph, AsyncSqliteSaver
* **Container Isolation:** Docker Engine (One-shot ephemeral execution containers)
* **AI Providers:** Groq API, Google Gemini API
* **Security Middleware:** Custom token-bucket rate limiter, payload sanitization

---

## Sandbox Security & Execution Engine

Code execution happens inside isolated, non-reusable container sandboxes (`sandbox-runner:latest`).

### Security Controls Applied Per Execution:

* **Network Isolation:** Strict `--network none` (no outbound network access allowed).
* **Resource Quotas:** Capped memory, restricted memory swap, hard CPU share limits (0.5 core default), and tight PIDs limit (`--pids-limit`) to prevent fork-bombs.
* **Privilege Reduction:** `--cap-drop ALL`, `--security-opt no-new-privileges`, and executed under fixed non-root `UID:GID (10000:10000)`.
* **Read-Only Filesystem:** Root filesystem mounted as `--read-only` with temporary storage limited to `noexec,nosuid` tmpfs mounts.
* **Runtime Guardrails:** Non-blocking slot manager for concurrency limits, IP token-bucket rate limiting, and standard runtime timeout watchdogs with guaranteed `finally`-block container cleanup.

---

## Getting Started

### Clone the Repository

To get started, clone the repository to your local machine:

```bash
git clone https://github.com/BinaryMonkAnkit/SapiensCode.git
cd SapiensCode

```

> **Note:** For detailed installation instructions and environment setup, please refer to the `README.md` files inside the `/backend` and `/frontend` directories.
