import { useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import CodeEditor from "./Editor/CodeEditor";
import Terminal from "./Terminal/Terminal";
import styles from "./CodeWorkspace.module.css";

const CodeWorkspace = ({ isDarkMode, getEditorCodeRef }) => {
  const [language, setLanguage] = useState("py");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Responsive mobile state
  const [isMobile, setIsMobile] = useState(false);

  const terminalRef = useRef(null);
  const editorLayoutRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
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

  const handleRun = () => terminalRef.current?.run(code, language);
  const handleStop = () => terminalRef.current?.stop();

  return (
    <div className={styles.workspace}>
      <div className={styles.wrapper}>
        {isMobile ? (
          /* =========================================================
             MOBILE LAYOUT (Strictly Vertical / Y-Axis Touch Dragging)
             ========================================================= */
          <Group
            key="v-mobile-group"
            id="v-mobile-group"
            orientation="vertical"
            direction="vertical"
            onLayoutChange={handlePanelResize}
            className={styles.verticalGroup}
          >
            <Panel defaultSize={60} minSize={15} className={styles.panelItem}>
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
                getEditorCodeRef={getEditorCodeRef}
              />
            </Panel>

            <Separator className={styles.resizeHandle} />

            <Panel defaultSize={40} minSize={15} className={styles.panelItem}>
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
        ) : (
          /* =========================================================
             DESKTOP LAYOUT (Strictly Horizontal / X-Axis Mouse Dragging)
             ========================================================= */
          <Group
            key="h-desktop-group"
            id="h-desktop-group"
            orientation="horizontal"
            direction="horizontal"
            onLayoutChange={handlePanelResize}
            className={styles.horizontalGroup}
          >
            <Panel defaultSize={60} minSize={15} className={styles.panelItem}>
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
                getEditorCodeRef={getEditorCodeRef}
              />
            </Panel>

            <Separator className={styles.resizeHandle} />

            <Panel defaultSize={40} minSize={15} className={styles.panelItem}>
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
        )}
      </div>
    </div>
  );
};

export default CodeWorkspace;
