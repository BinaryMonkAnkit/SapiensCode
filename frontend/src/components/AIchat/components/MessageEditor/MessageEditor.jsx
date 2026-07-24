import React, { useState, useEffect, useRef } from "react";
import styles from "../../ChatUI.module.css";

export default function MessageEditor({ initialText, onSave, onCancel }) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  return (
    <div className={styles["claude-edit-lane-wrapper"]}>
      <div className={styles["claude-edit-container"]}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={styles["claude-edit-textarea"]}
          placeholder="Edit message..."
          autoFocus
        />
        <div className={styles["claude-edit-actions"]}>
          <button onClick={onCancel} className={styles["claude-btn-cancel"]}>
            Cancel
          </button>
          <button
            onClick={() => onSave(text)}
            className={styles["claude-btn-save"]}
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}
