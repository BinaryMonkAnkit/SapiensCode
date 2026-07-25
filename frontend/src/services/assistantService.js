// src/services/assistantService.js
import { httpClient } from '../api/httpClient';
import { ASSISTANT_MODELS_ENDPOINT, ASSISTANT_CHAT_ENDPOINT } from '../config/env';
/**
 * Fetches available models list from FastAPI backend.
 */
export async function fetchAvailableModels() {
  try {
    return await httpClient(ASSISTANT_MODELS_ENDPOINT);
  } catch (error) {
    console.error("Error loading models:", error);
    return [];
  }
}

/**
 * Streams the assistant chat response.
 */
export async function streamChatAssistant(payload, onChunkReceived, onStreamComplete) {
  try {
    // Calls HTTP_BASE_URL + /assistant/chat -> http://localhost:8000/assistant/chat
    const response = await httpClient(ASSISTANT_CHAT_ENDPOINT, {
      method: 'POST',
      body: payload,
      stream: true,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunkReceived(chunk);
    }
  } catch (error) {
    console.error("Streaming error:", error);
    onChunkReceived(`\n\n❌ **Error:** Failed to connect to server.`);
  } finally {
    if (onStreamComplete) onStreamComplete();
  }
}