import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import styles from "./CodeEditor.module.css";

const LANGUAGES = [
  { value: "py", label: "Python", monacoLang: "python" },
  { value: "js", label: "JavaScript", monacoLang: "javascript" },
  { value: "java", label: "Java", monacoLang: "java" },
  { value: "c", label: "C", monacoLang: "c" },
  { value: "cpp", label: "C++", monacoLang: "cpp" },
];

const DEFAULT_TEMPLATE = {
  py: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")',
  js: 'console.log("Hello world")',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello World\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World" << std::endl;\n  return 0;\n}',
};

const CodeEditor = ({
  language,
  setLanguage,
  code,
  setCode,
  isRunning,
  isConnected,
  onRun,
  onStop,
  onEditorLayoutRef,
}) => {
  const editorRef = useRef(null);
  const codeAreaRef = useRef(null);

  // Swap template when language changes
  useEffect(() => {
    setCode(DEFAULT_TEMPLATE[language]);
  }, [language, setCode]);

  // Expose the layout update function back to the parent component
  useEffect(() => {
    if (onEditorLayoutRef) {
      onEditorLayoutRef.current = () => {
        editorRef.current?.layout();
      };
    }
  }, [onEditorLayoutRef]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl + Enter shortcut directly into Monaco
    editor.addAction({
      id: "run-code-shortcut",
      label: "Run Code",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        if (!isRunning) {
          onRun();
        }
      },
    });

    // FIX INITIAL GLITCH: Observe container until it gets non-zero dimensions on mount, then disconnect
    if (codeAreaRef.current) {
      const observer = new ResizeObserver(() => {
        if (
          codeAreaRef.current?.clientWidth > 0 &&
          codeAreaRef.current?.clientHeight > 0
        ) {
          editor.layout();
          observer.disconnect(); // Disconnect immediately so zero idle CPU is consumed
        }
      });
      observer.observe(codeAreaRef.current);
    }
  };

  const currentMonacoLanguage =
    LANGUAGES.find((lang) => lang.value === language)?.monacoLang ||
    "plaintext";

  return (
    <div className={styles.editorColumn}>
      <div className={styles.codeArea} ref={codeAreaRef}>
        <Editor
          height="100%"
          width="100%"
          language={currentMonacoLanguage}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={handleEditorDidMount}
          options={{
            readOnly: isRunning,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: false, // Saves CPU by turning off background polling timer
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span
            className={styles.statusDot}
            data-connected={isConnected}
            title={
              isConnected ? "connected to backend" : "not connected to backend"
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
            onClick={onRun}
            disabled={isRunning}
          >
            &gt; Run
          </button>
          <button
            className={styles.stopBtn}
            onClick={onStop}
            disabled={!isRunning}
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
