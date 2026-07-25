import { useCallback, useEffect, useRef, useState } from "react";
import { RECONNECT_DELAY_MS } from "./terminalConstants";

/**
 * Manages a WebSocket connection with automatic reconnect on close/error.
 *
 * Callbacks are stored in refs so `connect` keeps a stable identity across
 * renders, this avoids tearing down and rebuilding the socket every time a
 * parent re-renders with a new inline function.
 *
 * @param {Object} options
 * @param {string} options.url - WebSocket URL to connect to.
 * @param {(msg: any) => void} [options.onMessage] - Called with each parsed JSON message.
 * @param {() => void} [options.onOpen] - Called once the connection is established.
 * @param {(connected: boolean) => void} [options.onConnectionChange] - Called on connect/disconnect.
 * @param {(attempt: number) => void} [options.onDisconnectRetry] - Called each time a reconnect is scheduled.
 * @returns {{ connected: boolean, sendJSON: (obj: object) => boolean }}
 */
export function useTerminalSocket({
  url,
  onMessage,
  onOpen,
  onConnectionChange,
  onDisconnectRetry,
}) {
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep the latest callbacks available without changing `connect`'s identity.
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onDisconnectRetryRef = useRef(onDisconnectRetry);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);
  useEffect(() => {
    onDisconnectRetryRef.current = onDisconnectRetry;
  }, [onDisconnectRetry]);

  const sendJSON = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      retryCountRef.current = 0;
      setConnected(true);
      onConnectionChangeRef.current?.(true);
      onOpenRef.current?.();
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setConnected(false);
      onConnectionChangeRef.current?.(false);
      retryCountRef.current += 1;
      onDisconnectRetryRef.current?.(retryCountRef.current);
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setConnected(false);
      onConnectionChangeRef.current?.(false);
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.error("useTerminalSocket: failed to parse message", err);
        return;
      }
      onMessageRef.current?.(msg);
    };
  }, [url]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      // Detach handlers before closing so a close event fired during teardown
      // can't trigger a reconnect attempt after unmount.
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [connect]);

  return { connected, sendJSON };
}
