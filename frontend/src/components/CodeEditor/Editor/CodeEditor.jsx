import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
// import "../../styles/tokens.css";
import styles from "./CodeEditor.module.css";
import EditorToolbar, { LANGUAGES } from "./EditorToolBar";
import {
  handleEditorBeforeMount,
  createEditorMountHandler,
} from "./editorHandlers";

const DEFAULT_TEMPLATE = {
  py: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")',
  js: 'console.log("Hello world")',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello World\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World" << std::endl;\n  return 0;\n}',
};

const CodeEditor = ({
  isDarkMode,
  language,
  setLanguage,
  code,
  setCode,
  isRunning,
  isConnected,
  onRun,
  onStop,
  onEditorLayoutRef,
  getEditorCodeRef,
}) => {
  const editorRef = useRef(null);
  const codeAreaRef = useRef(null);

  // Swap template when language changes
  useEffect(() => {
    if (DEFAULT_TEMPLATE[language]) {
      setCode(DEFAULT_TEMPLATE[language]);
    }
  }, [language, setCode]);

  // Expose the layout update function back to the parent component
  useEffect(() => {
    if (onEditorLayoutRef) {
      onEditorLayoutRef.current = () => {
        editorRef.current?.layout();
      };
    }
  }, [onEditorLayoutRef]);

  // Expose a function to get the latest editor code
  useEffect(() => {
    if (getEditorCodeRef) {
      getEditorCodeRef.current = () => {
        return editorRef.current?.getValue() ?? "";
      };
    }
  }, [getEditorCodeRef]);

  //handler
  const handleEditorDidMount = createEditorMountHandler({
    editorRef,
    codeAreaRef,
    isRunning,
    onRun,
  });

  // Safe optional chaining fallback
  const currentMonacoLanguage =
    LANGUAGES?.find((lang) => lang.value === language)?.monacoLang ||
    "plaintext";

  return (
    <div className={styles.editorColumn}>
      <div className={styles.codeArea} ref={codeAreaRef}>
        <Editor
          height="100%"
          width="100%"
          language={currentMonacoLanguage}
          theme={isDarkMode ? "glass-dark" : "glass-light"}
          value={code}
          onChange={(value) => setCode(value || "")}
          beforeMount={handleEditorBeforeMount}
          onMount={handleEditorDidMount}
          options={{
            readOnly: isRunning,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: false,
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            wordWrap: "on",
            wrappingIndent: "indent",
          }}
        />
      </div>

      <EditorToolbar
        isDarkMode={isDarkMode}
        language={language}
        setLanguage={setLanguage}
        isRunning={isRunning}
        isConnected={isConnected}
        onRun={onRun}
        onStop={onStop}
      />
    </div>
  );
};

export default CodeEditor;
