import React, { useState, memo } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";

// 1. Import language definitions from highlight.js (hljs)
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import xml from "react-syntax-highlighter/dist/esm/languages/hljs/xml"; // Covers HTML and XML
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import yaml from "react-syntax-highlighter/dist/esm/languages/hljs/yaml";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import c from "react-syntax-highlighter/dist/esm/languages/hljs/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/hljs/csharp";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import ruby from "react-syntax-highlighter/dist/esm/languages/hljs/ruby";
import swift from "react-syntax-highlighter/dist/esm/languages/hljs/swift";
import kotlin from "react-syntax-highlighter/dist/esm/languages/hljs/kotlin";

import {
  atomOneDark as oneDark,
  atomOneLight as oneLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import styles from "./MarkdownRenderer.module.css";

// 2. Register top 20 languages (plus common aliases like js, ts, sh, html)
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("jsx", javascript);

SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("tsx", typescript);

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);

SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("html", xml);

SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);

SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c++", cpp);

SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("cs", csharp);

SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("golang", go);

SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("rs", rust);

SyntaxHighlighter.registerLanguage("php", php);

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);

SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);

SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("rb", ruby);

SyntaxHighlighter.registerLanguage("swift", swift);
SyntaxHighlighter.registerLanguage("kotlin", kotlin);
SyntaxHighlighter.registerLanguage("kt", kotlin);

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

  const language = match ? match[1].toLowerCase() : "text";

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
