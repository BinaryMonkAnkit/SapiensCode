import { WS_BASE_URL, CODE_EXECUTION_ENDPOINT } from "../../config/env";

// Cleanly construct the default WebSocket URL using imported environment constants
const GET_DEFAULT_WS_URL = () => {
  // If CODE_EXECUTION_ENDPOINT is a full URL (e.g. "ws://localhost:8000/ws/terminal")
  if (CODE_EXECUTION_ENDPOINT?.startsWith("ws")) {
    return CODE_EXECUTION_ENDPOINT;
  }

  // Otherwise combine base WS URL with endpoint path cleanly (avoiding double slashes)
  const base = (WS_BASE_URL || "ws://localhost:8000").replace(/\/$/, "");
  const endpoint = (CODE_EXECUTION_ENDPOINT || "/ws/terminal").replace(/^\//, "");

  return `${base}/${endpoint}`;
};

export const DEFAULT_WS_URL = GET_DEFAULT_WS_URL();

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