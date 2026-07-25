// src/services/useTerminalSocket.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RECONNECT_DELAY_MS } from "./terminalConstants";
import { getWebSocketUrl } from "../../api/wsClient";

/**
 * Manages a WebSocket connection with automatic reconnect on close/error.
 *
 * @param {Object} options
 * @param {string} [options.path] - Relative WebSocket endpoint (e.g., "/terminal" or "/ws").
 * @param {string} [options.url] - Explicit full WebSocket URL (optional override).
 * @param {(msg: any) => void} [options.onMessage] - Called with each parsed JSON message.
 * @param {() => void} [options.onOpen] - Called once connection is established.
 * @param {(connected: boolean) => void} [options.onConnectionChange] - Called on connect/disconnect.
 * @param {(attempt: number) => void} [options.onDisconnectRetry] - Called each time a reconnect is scheduled.
 * @returns {{ connected: boolean, sendJSON: (obj: object) => boolean }}
 */
export function useTerminalSocket({
  path,
  url,
  onMessage,
  onOpen,
  onConnectionChange,
  onDisconnectRetry,
}) {
  const [connected, setConnected] = useState(false);

  // Memoize targetUrl so we don't trigger unnecessary disconnect/reconnect loops on re-renders
  const targetUrl = useMemo(() => {
    if (url) return url;
    return getWebSocketUrl(path || "");
  }, [url, path]);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep latest callbacks available without breaking `connect` stability
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
    if (!targetUrl) return;

    const ws = new WebSocket(targetUrl);
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
  }, [targetUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
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