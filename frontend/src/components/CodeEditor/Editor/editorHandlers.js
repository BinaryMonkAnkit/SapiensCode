
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
        // Background
        "editor.background": "#f1f3f5",
        "editor.foreground": "#1F2937",

        // Cursor
        "editorCursor.foreground": "#2563EB",

        // Selection
        "editor.selectionBackground": "#3B82F633",
        "editor.inactiveSelectionBackground": "#3B82F61A",

        // Current line
        "editor.lineHighlightBackground": "#00000006",

        // Line numbers
        "editorLineNumber.foreground": "#9CA3AF",
        "editorLineNumber.activeForeground": "#374151",

        // Guides
        "editorIndentGuide.background": "#E5E7EB",
        "editorIndentGuide.activeBackground": "#CBD5E1",

        // Whitespace
        "editorWhitespace.foreground": "#D1D5DB",

        // Find
        "editor.findMatchBackground": "#F59E0B66",
        "editor.findMatchHighlightBackground": "#F59E0B22",

        // Brackets
        "editorBracketMatch.background": "#DBEAFE",
        "editorBracketMatch.border": "#2563EB",

        // Hover
        "editorHoverWidget.background": "#FFFFFF",
        "editorHoverWidget.border": "#D1D5DB",

        // Suggest Widget
        "editorSuggestWidget.background": "#FFFFFF",
        "editorSuggestWidget.border": "#D1D5DB",
        "editorSuggestWidget.selectedBackground": "#EEF4FF",

        // Scrollbar
        "scrollbarSlider.background": "#00000022",
        "scrollbarSlider.hoverBackground": "#00000033",
        "scrollbarSlider.activeBackground": "#00000055",
      },
    });
  };



// handler.js

export function createEditorMountHandler({
  editorRef,
  codeAreaRef,
  isRunning,
  onRun,
}) {
  return (editor, monaco) => {
    editorRef.current = editor;

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

    if (codeAreaRef.current) {
      const observer = new ResizeObserver(() => {
        if (
          codeAreaRef.current.clientWidth > 0 &&
          codeAreaRef.current.clientHeight > 0
        ) {
          editor.layout();
          observer.disconnect();
        }
      });

      observer.observe(codeAreaRef.current);
    }
  };
}