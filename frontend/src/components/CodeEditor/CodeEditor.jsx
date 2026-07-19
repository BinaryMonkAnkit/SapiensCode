import { useEffect, useRef, useState } from "react";
import "./theme.css";
import styles from "./CodeEditor.module.css";
import Terminal from "./Terminal";

// Only languages the test backend actually knows how to run without a
// compile step. The dropdown still lists the others so the UI is ready for
// them, the backend just replies with a clear "not wired up yet" message
// if one of those is picked - see main.py's LANGUAGE_RUNNERS.
const LANGUAGES = [
  { value: "py", label: "Python" },
  { value: "js", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
];

const DEFAULT_TEMPLATE = {
  py: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")',
  js: 'console.log("Hello world")',
  java: 'public class Main { public static void main(String[] args) { System.out.println("Hello World"); } }',
  c: '#include <stdio.h>\nint main() { printf("Hello World\\n"); return 0; }',
  cpp: '#include <iostream>\nint main() { std::cout << "Hello World" << std::endl; return 0; }',
};

const CodeEditor = () => {
  const [language, setLanguage] = useState("py");
  const [code, setCode] = useState(DEFAULT_TEMPLATE.py);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const codeRef = useRef(null);
  const gutterRef = useRef(null);
  const terminalRef = useRef(null);

  // Swap in a fresh template whenever the language changes, same as before.
  useEffect(() => {
    setCode(DEFAULT_TEMPLATE[language]);
  }, [language]);

  // Keep the line-number gutter's scroll position glued to the textarea's,
  // otherwise the numbers drift out of alignment with long files.
  const handleScroll = () => {
    if (gutterRef.current && codeRef.current) {
      gutterRef.current.scrollTop = codeRef.current.scrollTop;
    }
  };

  const runHandle = (e) => {
    e.preventDefault();
    terminalRef.current?.run(code, language);
  };

  const stopHandle = (e) => {
    e.preventDefault();
    terminalRef.current?.stop();
  };

  // Two conveniences expected of a real code editor: Tab inserts spaces
  // instead of jumping focus away, and Cmd/Ctrl+Enter runs the program
  // without needing to reach for the mouse.
  const handleEditorKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isRunning) terminalRef.current?.run(code, language);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const { selectionStart, selectionEnd } = el;
      const next =
        code.slice(0, selectionStart) + "  " + code.slice(selectionEnd);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + 2;
      });
    }
  };

  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  return (
    <div className={styles.editor}>
      <div className={styles.wrapper}>
        {/* LEFT: code editor */}
        <div className={styles.editorColumn}>
          <div className={styles.codeArea}>
            <div className={styles.gutter} ref={gutterRef}>
              {lineNumbers.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
            <textarea
              ref={codeRef}
              className={styles.codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleEditorKeyDown}
              spellCheck="false"
              disabled={isRunning}
              aria-label="Code editor"
            />
          </div>

          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span
                className={styles.statusDot}
                data-connected={isConnected}
                title={
                  isConnected
                    ? "connected to backend"
                    : "not connected to backend"
                }
              />
              <div className={styles.selectWrap}>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={styles.select}
                  disabled={isRunning}
                  aria-label="Programming language"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 10L12 15L17 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <div className={styles.toolbarRight}>
              <span className={styles.shortcutHint}>⌘/Ctrl + ⏎ to run</span>
              <button
                className={styles.runBtn}
                onClick={runHandle}
                disabled={isRunning}
              >
                &gt; Run
              </button>
              <button
                className={styles.stopBtn}
                onClick={stopHandle}
                disabled={!isRunning}
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: the live terminal, untouched internals */}
        <div className={styles.terminalColumn}>
          <Terminal
            ref={terminalRef}
            onRunStateChange={setIsRunning}
            onConnectionChange={setIsConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
