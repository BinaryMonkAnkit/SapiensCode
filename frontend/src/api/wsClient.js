// src/api/wsClient.js
import { WS_BASE_URL } from '../config/env';

/**
 * Builds a full WebSocket URL using the central WS_BASE_URL.
 * Handles missing/leading slashes cleanly.
 * @param {string} path - e.g., "/terminal/ws" or "ws"
 * @returns {string} - e.g., "ws://localhost:8000/terminal/ws"
 */
export function getWebSocketUrl(path = '') {
  if (!path) return WS_BASE_URL;
  if (path.startsWith('ws://') || path.startsWith('wss://')) {
    return path; // Already a full URL
  }
  
  const cleanBase = WS_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}