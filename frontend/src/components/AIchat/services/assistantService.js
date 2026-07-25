// src/services/assistantService.js

const BASE_URL = "http://localhost:8000/assistant"; // Double check your FastAPI server port and prefixes

/**
 * Fetches the available models list from backend to populate dropdowns.
 */
export async function fetchAvailableModels() {
  try {
    const response = await fetch(`${BASE_URL}/models`);
    if (!response.ok) throw new Error("Failed to fetch models");
    return await response.json();
  } catch (error) {
    console.error("Error loading models:", error);
    return [];
  }
}

/**
 * Streams the assistant chat response.
 * @param {Object} payload - The message context data payload.
 * @param {Function} onChunkReceived - Callback function fired whenever a new word/token arrives.
 * @param {Function} onStreamComplete - Callback function fired when stream finishes.
 */
// src/services/assistantService.js

export async function streamChatAssistant(payload, onChunkReceived, onStreamComplete) {
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error (${response.status}): ${errorText}`);
    }

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
    // Display the error directly inside your chat UI bubble so you know what went wrong
    onChunkReceived(`\n\n❌ **Error:** Failed to connect to server.`);
  } finally {
    // 🔍 THE FIX: This block ALWAYS runs, even if the code crashes or catches an error.
    if (onStreamComplete) onStreamComplete();
  }
}
