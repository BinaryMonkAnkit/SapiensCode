import React, { useState, useRef, useEffect } from "react";
import styles from "./ChatUI.module.css";
import PromptBar from "./components/PromptBar/PromptBar";
import ModelSelector from "./components/PromptBar/ModelSelector";
import ChatMessage from "./components/ChatMessage/ChatMessage";
import { generateUUID } from "./utils/generateUUID";
import {
  fetchAvailableModels,
  streamChatAssistant,
} from "../../services/assistantService";

export default function ChatUI({
  isDarkMode,
  editorCode = "",
  selectedText = "",
}) {
  const [messages, setMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const workspaceRef = useRef(null);
  const promptDockRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const lastUserMsgRef = useRef(null);

  const [showHero, setShowHero] = useState(true);
  const sessionIdRef = useRef(generateUUID());

  const hasMessages = messages.length > 0;

  // 1. Scroll user prompt to bottom / top of view upon submission
  const scrollToUserPrompt = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // 2. Adjust view during streaming so the start of the assistant response stays aligned (Gemini style)
  useEffect(() => {
    if (isStreaming && lastUserMsgRef.current && scrollContainerRef.current) {
      // Align the last user message near the top of the container
      // so the AI response immediately follows in clear view without jumping to the absolute bottom
      const userMsgTop = lastUserMsgRef.current.offsetTop;
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, userMsgTop - 70), // 70px offset for header spacing
        behavior: "smooth",
      });
    }
  }, [isStreaming]);

  useEffect(() => {
    if (hasMessages || !promptDockRef.current || !workspaceRef.current) return;

    const checkSpace = () => {
      if (!promptDockRef.current || !workspaceRef.current) return;

      const promptHeight = promptDockRef.current.offsetHeight;
      const workspaceHeight = workspaceRef.current.offsetHeight;

      const isHeightTooLarge = promptHeight > 150;
      const isScreenTooSmall = workspaceHeight < 450;

      setShowHero(!isHeightTooLarge && !isScreenTooSmall);
    };

    const observer = new ResizeObserver(checkSpace);
    observer.observe(promptDockRef.current);
    observer.observe(workspaceRef.current);

    return () => observer.disconnect();
  }, [hasMessages]);

  useEffect(() => {
    async function loadModels() {
      const data = await fetchAvailableModels();
      setModels(data);
      if (data && data.length > 0) {
        setSelectedModel(data[0].id);
      }
    }
    loadModels();
  }, []);

  const handleSendMessage = async (text) => {
    if (!text || !text.trim() || isStreaming) return;

    setEditingId(null);
    setIsStreaming(true);

    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text: text },
      { id: assistantMessageId, role: "assistant", text: "" },
    ]);

    // Force scroll down immediately after setting user message
    requestAnimationFrame(() => {
      scrollToUserPrompt();
    });

    const payload = {
      message: text,
      current_code: editorCode,
      selected_text: selectedText,
      session_id: sessionIdRef.current,
      model_id: selectedModel,
    };

    try {
      await streamChatAssistant(
        payload,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, text: msg.text + chunk }
                : msg,
            ),
          );
        },
        () => {
          setIsStreaming(false);
        },
      );
    } catch (err) {
      console.error("UI stream handler crash:", err);
    } finally {
      setIsStreaming(false);
    }
  };

  const startEditing = (id) => {
    if (isStreaming) return;
    setEditingId(id);
  };

  const saveEdit = (id, newText) => {
    if (!newText.trim() || isStreaming) return;

    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;

    const prunedHistory = messages.slice(0, msgIndex);
    setMessages(prunedHistory);
    setEditingId(null);
    handleSendMessage(newText);
  };

  const themeClass = isDarkMode ? styles["dark-theme"] : styles["light-theme"];

  return (
    <div className={`${styles["chat-container"]} ${themeClass}`}>
      <div className={styles["chat-header-chrome"]}>
        <span className={styles["chrome-title"]}>Chat with AI</span>
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isStreaming={isStreaming}
        />
      </div>

      <div
        ref={workspaceRef}
        className={`${styles["chat-workspace-body"]} ${
          hasMessages ? styles["grid-active"] : styles["grid-empty"]
        }`}
      >
        {hasMessages ? (
          <div ref={scrollContainerRef} className={styles["conversation-flow"]}>
            <div className={styles["scroll-content-centered-lane"]}>
              {messages.map((msg, index) => {
                const isLastUserMsg =
                  msg.role === "user" && index === messages.length - 2;

                return (
                  <div key={msg.id} ref={isLastUserMsg ? lastUserMsgRef : null}>
                    <ChatMessage
                      msg={msg}
                      isDarkMode={isDarkMode}
                      isStreaming={isStreaming}
                      isLastMessage={index === messages.length - 1}
                      isEditing={editingId === msg.id}
                      onStartEdit={startEditing}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles["prompt-dock-center"]}>
            <div
              className={`${styles["welcome-hero"]} ${
                showHero ? styles["hero-visible"] : styles["hero-hidden"]
              }`}
            >
              <h1 className={styles["hero-title"]}>
                How can I help you today?
              </h1>
            </div>

            <div ref={promptDockRef} className="w-full">
              <PromptBar
                className={styles.promptBar}
                isDarkMode={isDarkMode}
                onSubmit={handleSendMessage}
                disabled={isStreaming}
              />
            </div>
          </div>
        )}

        {hasMessages && (
          <div ref={promptDockRef} className={styles["prompt-dock-bottom"]}>
            <PromptBar
              className={styles.promptBar}
              isDarkMode={isDarkMode}
              onSubmit={handleSendMessage}
              disabled={isStreaming}
            />
          </div>
        )}
      </div>
    </div>
  );
}
