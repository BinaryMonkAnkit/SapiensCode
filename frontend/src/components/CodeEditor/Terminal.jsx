import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./Terminal.module.css";
import "./theme.css";

const WS_URL = "ws://localhost:8000/ws/terminal";

const Terminal = forwardRef(function Terminal(
  { onRunStateChange, onConnectionChange },
  ref,
) {
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState([
    {
      id: "init-1",
      text: "Type a command and press Enter, or click Run to execute the program live.",
      kind: "system",
    },
    {
      id: "init-2",
      text: "Available commands: help, time, echo <text>, clear",
      kind: "system",
    },
  ]);
  const [prompt, setPrompt] = useState(">");
  const [inputValue, setInputValue] = useState("");

  const wsRef = useRef(null);
  const screenRef = useRef(null);
  const inputRef = useRef(null);
  const reconnectTimer = useRef(null);
  const retryCountRef = useRef(0);
  const runningRef = useRef(false);
  const pendingPromptRef = useRef("");

  const addLine = useCallback((text, kind = "") => {
    setLines((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, kind },
    ]);
  }, []);

  const setRunning = useCallback(
    (isRunning) => {
      runningRef.current = isRunning;
      if (!isRunning) {
        pendingPromptRef.current = "";
        setPrompt(">");
      }
      onRunStateChange?.(isRunning);
    },
    [onRunStateChange],
  );

  const sendJSON = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }, []);

  const focusInputIfAppropriate = useCallback(() => {
    if (document.activeElement?.tagName === "TEXTAREA") return;
    inputRef.current?.focus();
  }, []);

  const handleDisconnectRetry = useCallback(() => {
    retryCountRef.current += 1;
    const currentCount = retryCountRef.current;
    const retryText = `disconnected from backend, retrying in 2s${
      currentCount > 1 ? ` (Attempt ${currentCount})` : ""
    }`;

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      if (lastLine && lastLine.isRetryLine) {
        return [...prev.slice(0, -1), { ...lastLine, text: retryText }];
      }
      return [
        ...prev,
        { id: Date.now(), text: retryText, kind: "error", isRetryLine: true },
      ];
    });
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      onConnectionChange?.(true);
      retryCountRef.current = 0;
      addLine("connected to the backend", "system");
    };

    ws.onclose = () => {
      setConnected(false);
      onConnectionChange?.(false);
      handleDisconnectRetry();
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      setConnected(false);
      onConnectionChange?.(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "ack") return;

      if (msg.type === "result") {
        if (msg.output === "__CLEAR__") {
          setLines([]);
          return;
        }
        if (msg.output) addLine(msg.output, "output");
        return;
      }

      if (msg.type === "stdout") {
        const combined = pendingPromptRef.current + msg.data;
        const parts = combined.split("\n");
        const tail = parts.pop();
        parts.forEach((part) => addLine(part, "output"));
        pendingPromptRef.current = tail;
        setPrompt(tail || ">");
        focusInputIfAppropriate();
        return;
      }

      if (msg.type === "exit") {
        if (pendingPromptRef.current)
          addLine(pendingPromptRef.current, "output");
        addLine(`process exited with code ${msg.code}`, "system");
        setRunning(false);
        return;
      }

      if (msg.type === "error") {
        addLine(msg.detail, "error");
        if (runningRef.current) setRunning(false);
      }
    };
  }, [
    addLine,
    focusInputIfAppropriate,
    handleDisconnectRetry,
    onConnectionChange,
    setRunning,
  ]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [lines]);

  useImperativeHandle(ref, () => ({
    run(code, language) {
      const sent = sendJSON({ type: "run_code", code, language });
      if (!sent) {
        addLine(
          `not connected to the backend at ${WS_URL} - make sure the server is running and reachable, then try again`,
          "error",
        );
        return false;
      }
      addLine("running program...", "system");
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
  }));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const line = inputValue;

      if (runningRef.current) {
        addLine(pendingPromptRef.current + line, "output");
        sendJSON({ type: "stdin", line });
        pendingPromptRef.current = "";
        setPrompt(">");
      } else {
        addLine("> " + line, "");
        sendJSON({ type: "command", line });
      }

      setInputValue("");
    }
  };

  return (
    <div className={styles.terminal} onClick={() => inputRef.current?.focus()}>
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

export default Terminal;
