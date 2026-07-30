import React, { useState, memo } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark as oneDark,
  atomOneLight as oneLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import styles from "./MarkdownRenderer.module.css";

const CodeBlock = memo(function CodeBlock({
  inline,
  className,
  children,
  isDarkMode,
  isStreaming,
  ...props
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    if (!codeContent) return;
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className={styles["inline-code"]} {...props}>
        {children}
      </code>
    );
  }

  const language = match ? match[1] : "text";

  return (
    <div className={styles["code-block-container"]}>
      <div className={styles["code-block-header"]}>
        <div className={styles["code-block-lang"]}>
          <Terminal size={12} />
          <span>{language}</span>
        </div>
        <button
          className={styles["code-block-copy-btn"]}
          onClick={handleCopy}
          type="button"
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
        {isStreaming || !match ? (
          <pre className={styles["streaming-pre"]}>
            <code className={styles["streaming-code"]}>{codeContent}</code>
          </pre>
        ) : (
          <SyntaxHighlighter
            style={isDarkMode ? oneDark : oneLight}
            language={language}
            PreTag="pre"
            customStyle={{
              margin: 0,
              padding: "16px",
              fontSize: "13.5px",
              borderRadius: 0,
              background: "transparent",
            }}
            {...props}
          >
            {codeContent}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
});

export default CodeBlock;
