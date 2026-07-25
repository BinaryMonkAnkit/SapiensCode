// Default WebSocket endpoint. Override via the `wsUrl` prop on <Terminal /> if
// a different backend host/port is needed per environment.
export const DEFAULT_WS_URL = "ws://localhost:8000/ws/terminal";

// How long to wait before attempting to reconnect after a dropped connection.
export const RECONNECT_DELAY_MS = 2000;

// Sentinel value the backend sends to request a full screen clear.
export const CLEAR_SENTINEL = "__CLEAR__";

// Line "kind" values, used for styling in Terminal.module.css.
export const LINE_KIND = {
  SYSTEM: "system",
  OUTPUT: "output",
  ERROR: "error",
  COMMAND: "",
};

// Inbound message types from the backend.
export const MESSAGE_TYPE = {
  ACK: "ack",
  RESULT: "result",
  STDOUT: "stdout",
  EXIT: "exit",
  ERROR: "error",
};

export const INITIAL_LINES = [
  {
    id: "init-1",
    text: "Type a command and press Enter, or click Run to execute the program live.",
    kind: LINE_KIND.SYSTEM,
  },
  {
    id: "init-2",
    text: "Available commands: help, time, echo <text>, clear",
    kind: LINE_KIND.SYSTEM,
  },
];