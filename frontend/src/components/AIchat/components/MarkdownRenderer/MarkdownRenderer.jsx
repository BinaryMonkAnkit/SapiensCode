import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import CodeBlock from "./CodeBlock";
import styles from "./MarkdownRenderer.module.css";

export default function MarkdownRenderer({ content, isDarkMode, isStreaming }) {
  // 1. Table-safe content sanitizer
  const sanitizedContent = useMemo(() => {
    if (typeof content !== "string") return content;

    return content
      .split("\n")
      .map((line) => {
        const isTableLine = line.trim().startsWith("|") || line.includes("|");

        if (isTableLine) {
          // Inside tables: normalize <br> to valid inline HTML tags so rehype-raw renders them safely inside the cell
          return line.replace(/<br\s*\/?>/gi, "<br />");
        }

        // Standard text: convert <br> to actual markdown newlines
        return line.replace(/<br\s*\/?>/gi, "\n");
      })
      .join("\n");
  }, [content]);

  // 2. Custom Markdown components
  const components = useMemo(
    () => ({
      code: ({ inline, className, children, ...props }) => (
        <CodeBlock
          inline={inline}
          className={className}
          isDarkMode={isDarkMode}
          isStreaming={isStreaming}
          {...props}
        >
          {children}
        </CodeBlock>
      ),
      table: ({ children, ...props }) => (
        <div className={styles["table-container"]}>
          <table className={styles["markdown-table"]} {...props}>
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead className={styles["markdown-thead"]} {...props}>
          {children}
        </thead>
      ),
      tbody: ({ children, ...props }) => (
        <tbody className={styles["markdown-tbody"]} {...props}>
          {children}
        </tbody>
      ),
      tr: ({ children, ...props }) => (
        <tr className={styles["markdown-tr"]} {...props}>
          {children}
        </tr>
      ),
      th: ({ children, ...props }) => (
        <th className={styles["markdown-th"]} {...props}>
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td className={styles["markdown-td"]} {...props}>
          {children}
        </td>
      ),
      hr: ({ ...props }) => <hr {...props} />,
      ul: ({ children, ...props }) => (
        <ul className={styles["markdown-ul"]} {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className={styles["markdown-ol"]} {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className={styles["markdown-li"]} {...props}>
          {children}
        </li>
      ),
    }),
    [isDarkMode, isStreaming],
  );

  return (
    <div className={styles["markdown-wrapper"]}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
