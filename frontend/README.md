# AI Code Assistant Platform — Frontend

A single-page React application that combines a streaming AI chat assistant, a live in-browser code editor with terminal execution, and an embedded programming-language documentation browser — all inside one seamless, scroll-driven "glass" interface.

The app is organized into three full-screen sections (**Chat**, **Editor**, **Docs**) that the user navigates between via mouse-wheel/trackpad gestures or a docked navigation rail, similar to a slide-based presentation experience.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Backend Contract](#backend-contract)
- [Key Components](#key-components)
- [Styling & Theming](#styling--theming)
- [Known Notes / Gotchas](#known-notes--gotchas)

---

## Features

### 🗨️ AI Chat Assistant

- Streaming responses rendered token-by-token from a backend HTTP endpoint (fetch + `ReadableStream`).
- Markdown rendering with GitHub-flavored Markdown (tables, etc.) and syntax-highlighted code blocks (copy-to-clipboard included).
- Model picker fetched dynamically from the backend (`/models` endpoint).
- Editable message history — editing a prior user message prunes subsequent history and re-submits.
- Voice input via the Web Speech API (`SpeechRecognition`), with live interim transcript merging.
- Auto-scroll behavior that keeps the newest exchange in view while streaming, and a "hero" welcome state for empty conversations.
- Persistent per-tab session ID (UUID) used to correlate a conversation with the backend.

### 💻 Live Code Editor & Terminal

- Monaco-based code editor (`@monaco-editor/react`) with custom light/dark "glass" themes.
- Supports Python, JavaScript, Java, C, and C++, each with a boilerplate starter template.
- Resizable, orientation-aware split panels (editor + terminal) built with `react-resizable-panels` — panels stack vertically on mobile and side-by-side on desktop.
- Run/Stop execution controlled by a keyboard shortcut (`Ctrl/Cmd + Enter`) or toolbar button.
- A WebSocket-backed terminal that streams stdout, handles interactive stdin, and auto-reconnects on disconnect with backoff.
- Connection status indicator and screen-clear sentinel support.

### 📚 Documentation Browser

- A language-selection grid (Python, JavaScript, C, C++, Java) that opens the official docs for the chosen language in an embedded iframe.
- Loading overlay while the iframe loads, and a "back to grid" control.

### 🧭 Shell / Navigation

- A single ambient, blurred background with a glassmorphism aesthetic across the whole app.
- Custom wheel/trackpad handling that distinguishes between scrolling _within_ a section (e.g., chat history, editor) and _between_ sections, with cooldowns to prevent over-triggering on trackpad momentum.
- A right-hand dock for direct navigation between sections and a light/dark theme toggle.

---

## Tech Stack

| Concern             | Library                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| UI Framework        | React (function components + hooks)                                                  |
| Build Tool          | Vite (`import.meta.env`)                                                             |
| Styling             | Tailwind CSS (utility classes) + CSS Modules + CSS custom properties (design tokens) |
| Code Editor         | Monaco Editor (`@monaco-editor/react`)                                               |
| Resizable Panels    | `react-resizable-panels`                                                             |
| Markdown            | `react-markdown` + `remark-gfm`                                                      |
| Syntax Highlighting | `react-syntax-highlighter` (highlight.js `atomOneDark` / `atomOneLight` themes)      |
| Icons               | `lucide-react`                                                                       |
| Realtime Transport  | Native `WebSocket` API (code execution/terminal)                                     |
| Streaming HTTP      | Native `fetch` with `ReadableStream` (chat)                                          |
| Voice Input         | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)                     |

> Note: no `package.json` was included in this context, so exact dependency versions aren't listed here — check the repository's `package.json` / lockfile for pinned versions.

---

## Project Structure

```
frontend/src/
├── api/
│   ├── httpClient.js         # Thin fetch wrapper (JSON + streaming support)
│   └── wsClient.js           # WebSocket URL builder
├── assets/
│   ├── programmingLang/      # Language icons (SVG + PNG) used in the editor & docs grid
│   └── assetConstants.js
├── components/
│   ├── AIchat/               # Chat feature (UI, markdown rendering, prompt bar, hooks)
│   ├── CodeEditor/           # Monaco editor + terminal + workspace layout
│   ├── Documentation/        # Language docs picker + iframe viewer
│   └── PageLayout/            # App shell: ambient background, section cards, nav dock
├── config/
│   └── env.js                # Centralized environment variable exports
├── services/
│   ├── TerminalServices/      # WebSocket constants + reconnecting socket hook
│   └── assistantService.js   # Chat/model REST calls
├── styles/
│   └── tokens.css            # Design tokens (CSS variables) for theming
├── App.jsx                   # Root component (renders MainLayout)
├── main.jsx                  # React entry point
└── index.css                 # Tailwind import + global utility overrides
```

---

## Architecture Overview

### App Shell (`MainLayout.jsx`)

`MainLayout` is the composition root. It defines three `SECTIONS` (`chat`, `editor`, `docs`), each mapped to a top-level feature component, and manages:

- `activeIdx` — which section is currently in view.
- `isDarkMode` — global theme flag, passed down to every section.
- A custom `wheel` event listener that decides whether to let a scroll event bubble into an inner scrollable container (e.g., chat history) or trigger a whole-section transition, with cooldown timers to smooth out trackpad momentum.

Each section is rendered inside a `SectionCard`, and transitions are driven by `activeIdx` rather than a continuous per-frame animation loop, so React re-renders only on section change while CSS transitions handle the visual motion.

### Chat (`ChatUI.jsx`)

- Loads available models on mount via `fetchAvailableModels()`.
- On submit, immediately appends a user message + an empty assistant placeholder message to local state, then streams backend chunks into that placeholder via `streamChatAssistant()`.
- Each request payload includes the message, `current_code`/`selected_text` (context from the editor, if wired up), a persistent `session_id`, and the selected `model_id`.
- Message editing re-sends from a truncated history rather than appending a duplicate turn.

### Code Workspace (`CodeWorkspace.jsx`)

- Holds `language` and `code` state, shared between the Monaco `CodeEditor` and the `Terminal`.
- Uses `react-resizable-panels` in horizontal (desktop) or vertical (mobile) orientation, remounting the panel group on breakpoint change to avoid layout bugs.
- `Terminal` exposes an imperative `run(code, language)` / `stop()` API via `forwardRef`, invoked by the toolbar's Run/Stop button or the `Ctrl/Cmd+Enter` Monaco keybinding.

### Terminal / Realtime Execution

- `useTerminalSocket` (in `services/TerminalServices`) manages a single reconnecting WebSocket connection: exponential-backoff-free fixed-delay reconnects, JSON message parsing, and stable callback refs to avoid tearing down the socket on every render.
- Inbound messages are typed (`ack`, `result`, `stdout`, `exit`, `error`) and rendered as distinct terminal line "kinds" (system/output/error/command) for styling.
- A `__CLEAR__` sentinel value from the backend clears the terminal screen (used for interactive `clear` commands).

### Documentation Viewer

- A static list of language → doc URL mappings (`languageOptions.js`) drives a selectable icon grid; selecting a language swaps to an `<iframe>` view of that language's official docs, with a loading overlay until the iframe fires `onLoad`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment variables (see below)
cp .env.example .env   # create this if it doesn't exist yet

# Run the dev server
npm run dev

# Build for production
npm run build
```

> This app expects a compatible backend exposing the REST/WebSocket endpoints described below (see `frontend/src/config/env.js` for the exact variable names).

---

## Environment Variables

Defined in `src/config/env.js`, all consumed via Vite's `import.meta.env`:

| Variable                         | Purpose                                                           | Example                        |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| `VITE_API_HTTP_BASE_URL`         | Base URL for REST calls                                           | `http://localhost:8000/api/v1` |
| `VITE_ASSISTANT_CHAT_ENDPOINT`   | Path for streaming chat completions                               | `/assistant/chat`              |
| `VITE_ASSISTANT_MODELS_ENDPOINT` | Path for listing available models                                 | `/assistant/models`            |
| `VITE_API_WS_BASE_URL`           | Base URL for WebSocket connections                                | `ws://localhost:8000`          |
| `VITE_CODE_SERVICE_ENDPOINT`     | Path (or full `ws://` URL) for the code-execution terminal socket | `/ws/terminal`                 |

`TerminalConstants.js` will use `VITE_CODE_SERVICE_ENDPOINT` directly as a full URL if it starts with `ws`, otherwise it joins it onto `VITE_API_WS_BASE_URL`.

---

## Backend Contract

The frontend assumes a backend (e.g., FastAPI, based on inline comments) that provides:

1. **`GET {ASSISTANT_MODELS_ENDPOINT}`** — returns an array of model objects, each with at least an `id` field.
2. **`POST {ASSISTANT_CHAT_ENDPOINT}`** (streaming response body) — accepts:
   ```json
   {
     "message": "string",
     "current_code": "string",
     "selected_text": "string",
     "session_id": "uuid",
     "model_id": "string"
   }
   ```
   and streams back raw text chunks (not SSE/JSON-framed — chunks are appended directly to the assistant message).
3. **WebSocket terminal endpoint** — accepts run/stop/stdin commands (implied by `Terminal.jsx`'s socket usage) and emits JSON messages shaped like:
   ```json
   { "type": "ack" | "result" | "stdout" | "exit" | "error", "output": "...", "data": "...", "code": 0, "detail": "..." }
   ```

---

## Key Components

| Component                                                 | Responsibility                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `MainLayout.jsx`                                          | App shell, section navigation, scroll-gesture handling, theme state                  |
| `ChatUI.jsx`                                              | Chat state, streaming orchestration, layout between hero/prompt bar and message list |
| `PromptBar.jsx`                                           | Autosizing textarea input, voice dictation, submit handling                          |
| `ModelSelector.jsx`                                       | Dropdown for choosing the active AI model                                            |
| `MarkdownRenderer.jsx` / `CodeBlock.jsx`                  | Renders assistant Markdown output, with copyable syntax-highlighted code fences      |
| `CodeWorkspace.jsx`                                       | Resizable editor/terminal split layout                                               |
| `CodeEditor.jsx` / `EditorToolBar.jsx`                    | Monaco wrapper, language selection, run/stop controls                                |
| `Terminal.jsx` / `useTerminalSocket.js`                   | WebSocket-driven interactive terminal with auto-reconnect                            |
| `Documentation.jsx` / `LanguageGrid.jsx` / `DocFrame.jsx` | Language picker and embedded documentation iframe                                    |
| `RightDock.jsx`                                           | Section navigation dots + theme toggle                                               |

---

## Styling & Theming

- **Design tokens** live in `src/styles/tokens.css` as CSS custom properties (e.g., `--bg-app`, `--text-primary`, `--sb-*` editor/terminal variables), consumed throughout via `var(--token-name)`.
- **Dark/light mode** is a single boolean (`isDarkMode`) lifted to `MainLayout` and threaded down as props/`data-theme` attributes; components branch their CSS Module classes or Monaco theme accordingly.
- **CSS Modules** scope component-level styles (`*.module.css`), while Tailwind utility classes handle quick layout/spacing needs inline.
- The overall aesthetic is a translucent "glassmorphism" look — blurred backdrops, subtle borders, and soft shadows — defined largely through the token file and reused across the prompt bar, dropdown menus, and section cards.

---

## Known Notes / Gotchas

- `env.js` currently logs the HTTP base URL to the console (`console.log('http base url: ', HTTP_BASE_URL)`) — worth removing before shipping to production.
- `useTerminalSocket.js` imports from `./terminalConstants` (lowercase) while the actual file is `TerminalConstants.js` — verify case sensitivity on case-sensitive filesystems (Linux CI/production) to avoid build failures.
- The Monaco editor is mounted with `automaticLayout: false` and instead relies on manual `editor.layout()` calls (via `onEditorLayoutRef`) triggered by `ResizeObserver`/panel-resize/breakpoint-change events — keep this in mind when adding new places that resize the editor's container.
- Speech-to-text (`PromptBar.jsx`) only works in browsers implementing the (non-standard) `SpeechRecognition`/`webkitSpeechRecognition` APIs; it degrades to an `alert()` fallback otherwise.
