import React, { useState, memo } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark as oneDark,
  atomOneLight as oneLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import styles from "./MarkdownRenderer.module.css";

// Memoize the code block so existing blocks don't re-render
// when new streaming messages update parent state.
const CodeBlock = memo(function CodeBlock({
  inline,
  className,
  children,
  isDarkMode,
  isStreaming, // Pass isStreaming prop down if available in Markdown component
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
    const language = match[1];

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
          {/* While streaming, render light raw text to eliminate tokenization lag. 
              Once streaming ends, switch to full syntax highlighting. */}
          {isStreaming ? (
            <pre
              style={{
                margin: 0,
                padding: "18px",
                fontSize: "13.5px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <code>{codeContent}</code>
            </pre>
          ) : (
            <SyntaxHighlighter
              style={isDarkMode ? oneDark : oneLight}
              language={language}
              PreTag="div"
              codeTagProps={{
                style: { background: "transparent" },
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
          )}
        </div>
      </div>
    );
  }

  return (
    <code className={styles["inline-code"]} {...props}>
      {children}
    </code>
  );
});

export default CodeBlock;
