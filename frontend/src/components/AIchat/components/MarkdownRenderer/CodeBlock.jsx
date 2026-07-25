import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./MarkdownRenderer.module.css";

export default function CodeBlock({
  inline,
  className,
  children,
  isDarkMode,
  ...props
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check size={12} style={{ color: "#22c55e" }} />
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
            codeTagProps={{
              style: {
                background: "transparent",
              },
            }}
            customStyle={{
              margin: 0,
              padding: "18px",
              fontSize: "13.5px",
              borderRadius: 0,
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
}
