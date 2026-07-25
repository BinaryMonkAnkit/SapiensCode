import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";
import styles from "./MarkdownRenderer.module.css";

export default function MarkdownRenderer({ content, isDarkMode }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: (props) => <CodeBlock isDarkMode={isDarkMode} {...props} />,
        table: ({ children }) => (
          <div className={styles["table-container"]}>
            <table className={styles["markdown-table"]}>{children}</table>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
