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
 * Streams the assistant chat response by parsing SSE event lines.
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
    let buffer = ""; // Keeps track of split TCP network chunks

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split SSE packets by line breaks
      const lines = buffer.split("\n");
      
      // Save incomplete trailing chunk back to the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, "");

        try {
          const parsed = JSON.parse(jsonStr);

          // 1. Handle Backend Errors Mid-Stream
          if (parsed.error) {
            onChunkReceived(`\n\n⚠️ **Error:** ${parsed.error}`);
            continue;
          }

          // 2. Pass ONLY clean plain-text string chunk to UI
          if (parsed.content) {
            onChunkReceived(parsed.content);
          }
        } catch (err) {
          console.error("Failed to parse SSE line:", trimmed, err);
        }
      }
    }
  } catch (error) {
    console.error("Streaming error:", error);
    onChunkReceived(`\n\n❌ **Error:** Failed to connect to server.`);
  } finally {
    if (onStreamComplete) onStreamComplete();
  }
}