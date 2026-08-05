
export const handleEditorBeforeMount=(monaco)=>{
monaco.editor.defineTheme("glass-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        // Background
        "editor.background": "#232325",
        "editor.foreground": "#E8ECF3",

        // Cursor
        "editorCursor.foreground": "#6EA8FF",

        // Selection
        "editor.selectionBackground": "#3B82F655",
        "editor.inactiveSelectionBackground": "#3B82F622",

        // Current line
        "editor.lineHighlightBackground": "#FFFFFF08",

        // Line numbers
        "editorLineNumber.foreground": "#687385",
        "editorLineNumber.activeForeground": "#FFFFFF",

        // Guides
        "editorIndentGuide.background": "#2B3340",
        "editorIndentGuide.activeBackground": "#4B5563",

        // Whitespace
        "editorWhitespace.foreground": "#404B5A",

        // Find
        "editor.findMatchBackground": "#F59E0B66",
        "editor.findMatchHighlightBackground": "#F59E0B33",

        // Brackets
        "editorBracketMatch.background": "#3B82F622",
        "editorBracketMatch.border": "#60A5FA",

        // Hover
        "editorHoverWidget.background": "#202733",
        "editorHoverWidget.border": "#394150",

        // Suggest Widget
        "editorSuggestWidget.background": "#202733",
        "editorSuggestWidget.border": "#394150",
        "editorSuggestWidget.selectedBackground": "#2F3A4A",

        // Scrollbar
        "scrollbarSlider.background": "#FFFFFF22",
        "scrollbarSlider.hoverBackground": "#FFFFFF44",
        "scrollbarSlider.activeBackground": "#FFFFFF66",
      },
    });

    monaco.editor.defineTheme("glass-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
      "editor.background": "#e0e3e4b2",
      "editor.foreground": "#24292e",
      "editorGutter.background": "#e0e3e4b2",
      "editorLineNumber.foreground": "#959da5",
      "editorLineNumber.activeForeground": "#24292e",
      "editor.lineHighlightBackground": "#eaecef",
      "editor.selectionBackground": "#c8c8fa80",
      "editorCursor.foreground": "#0366d6",
}
    });
  };


// handler.js
export function createEditorMountHandler({
  editorRef,
  codeAreaRef,
  getIsRunning,
  onRun,
}) {
  return (editor, monaco) => {
    editorRef.current = editor;

    // Use addCommand with a unique keybinding (automatically managed per editor instance)
    const disposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        if (getIsRunning && getIsRunning()) return;

        const currentCode = editor.getValue();
        if (currentCode.trim()) {
          onRun(currentCode);
        }
      }
    );

    // Clean up ResizeObserver when editor unmounts
    if (codeAreaRef.current) {
      const observer = new ResizeObserver(() => {
        if (
          codeAreaRef.current.clientWidth > 0 &&
          codeAreaRef.current.clientHeight > 0
        ) {
          editor.layout();
        }
      });

      observer.observe(codeAreaRef.current);

      editor.onDidDispose(() => {
        observer.disconnect();
        disposable?.dispose();
      });
    }
  };
}