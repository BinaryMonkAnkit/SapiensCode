import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./Terminal.module.css";
import { useTerminalSocket } from "../../../services/TerminalServices/useTerminalSocket";
import {
  CLEAR_SENTINEL,
  DEFAULT_WS_URL,
  INITIAL_LINES,
  LINE_KIND,
  MESSAGE_TYPE,
  RECONNECT_DELAY_MS,
} from "../../../services/TerminalServices/terminalConstants";

/**
 * @typedef {Object} TerminalHandle
 * @property {(code: string, language: string) => boolean} run
 * @property {() => void} stop
 * @property {() => boolean} isConnected
 */

const Terminal = forwardRef(function Terminal(
  { onRunStateChange, onConnectionChange, isDarkMode, wsUrl = DEFAULT_WS_URL },
  ref,
) {
  const [lines, setLines] = useState(INITIAL_LINES);
  const [prompt, setPrompt] = useState(">");
  const [inputValue, setInputValue] = useState("");

  const screenRef = useRef(null);
  const inputRef = useRef(null);
  const runningRef = useRef(false);
  const pendingPromptRef = useRef("");

  // Ref wrappers to keep parent prop changes stable
  const onRunStateChangeRef = useRef(onRunStateChange);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => {
    onRunStateChangeRef.current = onRunStateChange;
  }, [onRunStateChange]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  const addLine = useCallback((text, kind = "") => {
    setLines((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        text,
        kind,
      },
    ]);
  }, []);

  const focusInputIfAppropriate = useCallback(() => {
    if (document.activeElement?.tagName === "TEXTAREA") return;
    inputRef.current?.focus();
  }, []);

  const setRunning = useCallback((isRunning) => {
    runningRef.current = isRunning;
    if (!isRunning) {
      pendingPromptRef.current = "";
      setPrompt(">");
    }
    onRunStateChangeRef.current?.(isRunning);
  }, []);

  const handleOpen = useCallback(() => {
    addLine("connected to the backend", LINE_KIND.SYSTEM);
  }, [addLine]);

  const handleDisconnectRetry = useCallback((attempt) => {
    const retryText = `disconnected from backend, retrying in ${
      RECONNECT_DELAY_MS / 1000
    }s${attempt > 1 ? ` (Attempt ${attempt})` : ""}`;

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      if (lastLine?.isRetryLine) {
        return [...prev.slice(0, -1), { ...lastLine, text: retryText }];
      }
      return [
        ...prev,
        {
          id: `retry-${Date.now()}`,
          text: retryText,
          kind: LINE_KIND.ERROR,
          isRetryLine: true,
        },
      ];
    });
  }, []);

  const handleMessage = useCallback(
    (msg) => {
      switch (msg.type) {
        case MESSAGE_TYPE.ACK:
          return;

        case MESSAGE_TYPE.RESULT: {
          if (msg.output === CLEAR_SENTINEL) {
            setLines([]);
            return;
          }
          if (msg.output) addLine(msg.output, LINE_KIND.OUTPUT);
          return;
        }

        case MESSAGE_TYPE.STDOUT: {
          const combined = pendingPromptRef.current + (msg.data || "");
          const parts = combined.split("\n");
          const tail = parts.pop();
          parts.forEach((part) => addLine(part, LINE_KIND.OUTPUT));
          pendingPromptRef.current = tail;
          setPrompt(tail || ">");
          focusInputIfAppropriate();
          return;
        }

        case MESSAGE_TYPE.EXIT: {
          if (pendingPromptRef.current) {
            addLine(pendingPromptRef.current, LINE_KIND.OUTPUT);
          }
          addLine(`process exited with code ${msg.code}`, LINE_KIND.SYSTEM);
          setRunning(false);
          return;
        }

        case MESSAGE_TYPE.ERROR: {
          addLine(msg.detail || "An unknown error occurred", LINE_KIND.ERROR);
          if (runningRef.current) setRunning(false);
          return;
        }

        default:
          return;
      }
    },
    [addLine, focusInputIfAppropriate, setRunning],
  );

  const { connected, sendJSON } = useTerminalSocket({
    url: wsUrl,
    onOpen: handleOpen,
    onMessage: handleMessage,
    onConnectionChange: (status) => onConnectionChangeRef.current?.(status),
    onDisconnectRetry: handleDisconnectRetry,
  });

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [lines]);

  useImperativeHandle(
    ref,
    () => ({
      run(code, language) {
        const sent = sendJSON({ type: "run_code", code, language });
        if (!sent) {
          addLine("Not connected to the backend.", LINE_KIND.ERROR);
          return false;
        }
        addLine("running program...", LINE_KIND.SYSTEM);
        setRunning(true);
        inputRef.current?.focus();
        return true;
      },
      stop() {
        sendJSON({ type: "stop" });
      },
      isConnected() {
        return connected;
      },
    }),
    [sendJSON, addLine, setRunning, connected],
  );

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const line = inputValue;

    if (runningRef.current) {
      addLine(pendingPromptRef.current + line, LINE_KIND.OUTPUT);
      sendJSON({ type: "stdin", line });
      pendingPromptRef.current = "";
      setPrompt(">");
    } else {
      addLine("> " + line, LINE_KIND.COMMAND);
      sendJSON({ type: "command", line });
    }

    setInputValue("");
  };

  return (
    <div
      className={styles.terminal}
      data-theme={isDarkMode ? "dark" : "light"}
      onClick={() => inputRef.current?.focus()}
    >
      <div className={styles.titlebar}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Console Output</span>
          <span className={styles.badge}>Interactive Terminal</span>
        </div>

        <div
          className={`${styles.status} ${connected ? styles.connected : ""}`}
        >
          <span className={styles.led} />
          <span>{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      <div className={styles.screen} ref={screenRef}>
        {lines.map((line) => (
          <div
            key={line.id}
            className={`${styles.line} ${styles[line.kind] || ""}`}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className={styles.inputRow}>
        <span className={styles.prompt}>{prompt}</span>
        <input
          ref={inputRef}
          className={styles.hiddenInput}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Terminal input"
        />
      </div>
    </div>
  );
});

Terminal.displayName = "Terminal";

export default Terminal;
