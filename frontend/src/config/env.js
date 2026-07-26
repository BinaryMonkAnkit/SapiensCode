// src/config/env.js

// HTTP Base URL (Fallback to http://localhost:8000/api/v1)
export const HTTP_BASE_URL = import.meta.env.VITE_API_HTTP_BASE_URL;
export const ASSISTANT_CHAT_ENDPOINT = import.meta.env.VITE_ASSISTANT_CHAT_ENDPOINT;
export const ASSISTANT_MODELS_ENDPOINT = import.meta.env.VITE_ASSISTANT_MODELS_ENDPOINT;




// WebSocket Base URL (Fallback to ws://localhost:8000/ws)
export const WS_BASE_URL = import.meta.env.VITE_API_WS_BASE_URL;
export const CODE_EXECUTION_ENDPOINT = import.meta.env.VITE_CODE_SERVICE_ENDPOINT;
