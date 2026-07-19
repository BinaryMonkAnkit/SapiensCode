import React, { useState, useRef, useEffect } from "react";
import { Copy, Edit3, Check, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./ChatUI.module.css";
import PromptBar from "./components/PromptBar";
import ModelSelector from "./components/ModelSelector";
import {
  fetchAvailableModels,
  streamChatAssistant,
} from "./services/assistantService";

const generateUUID = () => Math.random().toString(36).substring(2, 15);

export default function ChatUI({
  isDarkMode,
  editorCode = "",
  selectedText = "",
}) {
  const [messages, setMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copiedBlockText, setCopiedBlockText] = useState("");

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 🔍 Scroll Timeout State to toggle scrollbar visibility
  const [isScrolling, setIsScrolling] = useState(false);

  const sessionIdRef = useRef(generateUUID());
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isEditingActionRef = useRef(false);

  const hasMessages = messages.length > 0;

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

  // Scroll Stabilization Engine
  useEffect(() => {
    if (hasMessages && scrollContainerRef.current) {
      if (isEditingActionRef.current) {
        isEditingActionRef.current = false;
        return;
      }
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, hasMessages]);

  // 🔍 Track Scroll activity to manage disappearing visibility triggers
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200); // Disappears after 1.2 seconds of zero movement
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [hasMessages]);

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

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCodeBlock = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedBlockText("copied");
    setTimeout(() => setCopiedBlockText(""), 2000);
  };

  const startEditing = (id, text) => {
    if (isStreaming) return;
    isEditingActionRef.current = true;
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = (id) => {
    if (!editText.trim() || isStreaming) return;

    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;

    const prunedHistory = messages.slice(0, msgIndex);
    setMessages(prunedHistory);
    setEditingId(null);
    handleSendMessage(editText);
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
        className={`${styles["chat-workspace-body"]} ${hasMessages ? styles["grid-active"] : styles["grid-empty"]}`}
      >
        {!hasMessages && (
          <div className={styles["welcome-hero"]}>
            <h1 className={styles["hero-title"]}>How can I help you today?</h1>
          </div>
        )}

        {hasMessages && (
          /* 🔍 ADDED: Dynamic style tracking toggle for interaction visibility triggers */
          <div
            ref={scrollContainerRef}
            className={`${styles["conversation-flow"]} ${isScrolling ? styles["scrolling-active"] : ""}`}
          >
            <div className={styles["scroll-content-centered-lane"]}>
              {messages.map((msg) => {
                const MarkdownComponents = {
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeContent = String(children).replace(/\n$/, "");

                    if (!inline && match) {
                      return (
                        <div className={styles["code-block-container"]}>
                          <div className={styles["code-block-header"]}>
                            <div className={styles["code-block-lang"]}>
                              <Terminal size={12} />
                              <span>{match[1]}</span>
                            </div>
                            <button
                              className={styles["code-block-copy-btn"]}
                              onClick={() => copyCodeBlock(codeContent)}
                            >
                              {copiedBlockText === "copied" ? (
                                <>
                                  <Check
                                    size={12}
                                    style={{ color: "#22c55e" }}
                                  />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy code</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className={styles["code-block-scroll"]}>
                            <SyntaxHighlighter
                              style={isDarkMode ? oneDark : oneLight}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                padding: "14px",
                                background: "transparent",
                                fontSize: "13.5px",
                              }}
                              {...props}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <code className={styles["inline-code"]} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className={styles["table-container"]}>
                      <table className={styles["markdown-table"]}>
                        {children}
                      </table>
                    </div>
                  ),
                };

                if (editingId === msg.id) {
                  return (
                    <div
                      key={msg.id}
                      className={styles["claude-edit-lane-wrapper"]}
                    >
                      <div className={styles["claude-edit-container"]}>
                        <textarea
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height =
                              e.target.scrollHeight + "px";
                          }}
                          className={styles["claude-edit-textarea"]}
                          placeholder="Edit message..."
                          autoFocus
                          ref={(tag) => {
                            if (tag) {
                              tag.style.height = "auto";
                              tag.style.height = tag.scrollHeight + "px";
                            }
                          }}
                        />
                        <div className={styles["claude-edit-actions"]}>
                          <button
                            onClick={() => setEditingId(null)}
                            className={styles["claude-btn-cancel"]}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(msg.id)}
                            className={styles["claude-btn-save"]}
                          >
                            Resend
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`${styles["message-row"]} ${msg.role === "user" ? styles["user-row"] : styles["assistant-row"]}`}
                  >
                    <div className={styles["bubble-wrapper"]}>
                      {msg.role === "user" && (
                        <div className={styles["bubble-header"]}>
                          <span className={styles["role-badge"]}>You</span>
                        </div>
                      )}

                      <div className={styles["message-text"]}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                        >
                          {msg.text ||
                            (isStreaming &&
                            msg.id === messages[messages.length - 1].id
                              ? "●"
                              : "")}
                        </ReactMarkdown>
                      </div>

                      {msg.role === "user" ? (
                        <div className={styles["user-bottom-dock"]}>
                          <button
                            onClick={() => startEditing(msg.id, msg.text)}
                            disabled={isStreaming}
                            className={styles["action-btn"]}
                            title="Edit message"
                          >
                            <Edit3 size={13} />
                            <span className={styles["btn-label-text"]}>
                              Edit
                            </span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.text)}
                            disabled={!msg.text}
                            className={styles["action-btn"]}
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check size={13} style={{ color: "#22c55e" }} />
                            ) : (
                              <Copy size={13} />
                            )}
                            <span className={styles["btn-label-text"]}>
                              {copiedId === msg.id ? "Copied" : "Copy"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className={styles["assistant-bottom-dock"]}>
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.text)}
                            disabled={!msg.text}
                            className={styles["action-btn"]}
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check size={13} style={{ color: "#22c55e" }} />
                            ) : (
                              <Copy size={13} />
                            )}
                            <span className={styles["btn-label-text"]}>
                              {copiedId === msg.id ? "Copied" : "Copy"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={
            hasMessages
              ? styles["prompt-dock-bottom"]
              : styles["prompt-dock-center"]
          }
        >
          <PromptBar
            isDarkMode={isDarkMode}
            onSubmit={handleSendMessage}
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
