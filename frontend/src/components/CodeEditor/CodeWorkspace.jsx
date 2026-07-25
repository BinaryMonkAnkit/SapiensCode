import { useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import CodeEditor from "./Editor/CodeEditor";
import Terminal from "./Terminal/Terminal";
import styles from "./CodeWorkspace.module.css";

const CodeWorkspace = ({ isDarkMode }) => {
  const [language, setLanguage] = useState("py");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Responsive layout state
  const [isMobile, setIsMobile] = useState(false);

  const terminalRef = useRef(null);
  const editorLayoutRef = useRef(null);
  const rafRef = useRef(null);

  // Detect screen size changes below 768px
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Trigger editor layout update once CSS layout finishes reflowing
      setTimeout(() => {
        editorLayoutRef.current?.();
      }, 50);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePanelResize = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      editorLayoutRef.current?.();
    });
  };

  const handleRun = () => {
    terminalRef.current?.run(code, language);
  };

  const handleStop = () => {
    terminalRef.current?.stop();
  };

  return (
    <div className={`${styles.workspace} workspace`}>
      <div className={styles.wrapper}>
        <Group
          key={isMobile ? "vertical-mode" : "horizontal-mode"} // KEY force-remounts component tree during switch to prevent layout bug
          orientation={isMobile ? "vertical" : "horizontal"} // Modern library prop
          direction={isMobile ? "vertical" : "horizontal"} // Legacy library prop fallback
          onLayoutChange={handlePanelResize}
          style={{ height: "100%", width: "100%", display: "flex" }}
        >
          {/* EDITOR PANEL */}
          <Panel
            defaultSize={60}
            minSize={20}
            // style={{ display: "flex", flexDirection: "column" }}
          >
            <CodeEditor
              isDarkMode={isDarkMode}
              language={language}
              setLanguage={setLanguage}
              code={code}
              setCode={setCode}
              isRunning={isRunning}
              isConnected={isConnected}
              onRun={handleRun}
              onStop={handleStop}
              onEditorLayoutRef={editorLayoutRef}
            />
          </Panel>

          {/* RESIZE HANDLE */}
          <Separator className={styles.resizeHandle} />

          {/* TERMINAL PANEL */}
          <Panel
            defaultSize={50}
            minSize={20}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className={styles.terminalColumn}>
              <Terminal
                isDarkMode={isDarkMode}
                ref={terminalRef}
                onRunStateChange={setIsRunning}
                onConnectionChange={setIsConnected}
              />
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
};

export default CodeWorkspace;
