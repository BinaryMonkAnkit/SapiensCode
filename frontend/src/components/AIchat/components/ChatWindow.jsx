const handleSendMessage = async () => {
  const response = await fetch("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userQuery,
      current_code: editorCode, // Get current value from your code editor state
      selected_text: getSelectedText(), // Optional: if user highlighted text
      session_id: "unique-user-session-id",
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);

    // Append 'chunk' to your active chat message bubble state here
    setChatHistory((prev) => updateLastMessage(prev, chunk));
  }
};
