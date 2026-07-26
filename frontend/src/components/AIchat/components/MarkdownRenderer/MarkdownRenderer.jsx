import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";
import styles from "./MarkdownRenderer.module.css";

export default function MarkdownRenderer({ content, isDarkMode, isStreaming }) {
  // Memoizing component overrides prevents React from re-creating
  // component functions on every incoming message chunk.
  const components = useMemo(
    () => ({
      code: (props) => (
        <CodeBlock
          isDarkMode={isDarkMode}
          isStreaming={isStreaming}
          {...props}
        />
      ),
      table: ({ children }) => (
        <div className={styles["table-container"]}>
          <table className={styles["markdown-table"]}>{children}</table>
        </div>
      ),
    }),
    [isDarkMode, isStreaming],
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
