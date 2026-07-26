import React, { useState } from "react";
import { Copy, Edit3, Check } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer/MarkdownRenderer";
import MessageEditor from "../MessageEditor/MessageEditor";
import styles from "./ChatMessage.module.css";

export default function ChatMessage({
  msg,
  isDarkMode,
  isStreaming,
  isLastMessage,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isEditing) {
    return (
      <MessageEditor
        initialText={msg.text}
        onSave={(newText) => onSaveEdit(msg.id, newText)}
        onCancel={() => onCancelEdit()}
      />
    );
  }

  const displayText =
    isStreaming && isLastMessage && !msg.text ? "●" : msg.text;

  // Determine dark vs light mode class for assistant bubble
  const assistantThemeClass = isDarkMode
    ? styles.assistantDark
    : styles.assistantLight;

  return (
    <div
      className={`${styles["message-row"]} ${
        msg.role === "user" ? styles["user-row"] : styles["assistant-row"]
      }`}
    >
      <div
        className={`${styles["bubble-wrapper"]} ${
          msg.role === "assistant" ? assistantThemeClass : ""
        }`}
      >
        {msg.role === "user" && (
          <div className={styles["bubble-header"]}>
            <span className={styles["role-badge"]}>You</span>
          </div>
        )}

        <div className={styles["message-text"]}>
          <MarkdownRenderer content={displayText} isDarkMode={isDarkMode} />
        </div>

        <div
          className={
            msg.role === "user"
              ? styles["user-bottom-dock"]
              : styles["assistant-bottom-dock"]
          }
        >
          {msg.role === "user" && (
            <button
              onClick={() => onStartEdit(msg.id)}
              disabled={isStreaming}
              className={styles["action-btn"]}
              title="Edit message"
            >
              <Edit3 size={13} />
              <span className={styles["btn-label-text"]}>Edit</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={!msg.text}
            className={styles["action-btn"]}
            title="Copy message"
          >
            {copied ? (
              <Check size={13} style={{ color: "#22c55e" }} />
            ) : (
              <Copy size={13} />
            )}
            <span className={styles["btn-label-text"]}>
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
