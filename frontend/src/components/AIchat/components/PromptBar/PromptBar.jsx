import { useState, useRef, useLayoutEffect } from "react";
import PromptBarIcons from "./PromptBarIcons";
import styles from "./PromptBar.module.css";

export default function PromptBar({
  placeholder = "Ask your query to get help from an AI.",
  onSubmit = () => {},
  theme = "light",
  isDarkMode = undefined,
}) {
  const [value, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isWrapped, setIsWrapped] = useState(false);

  // Keeps track of text before speech started to prevent looping duplicates
  const baseTextRef = useRef("");

  const isDark =
    typeof isDarkMode === "boolean" ? isDarkMode : theme === "dark";

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const wrapped = el.scrollHeight > lineHeight * 1.1;
    setIsWrapped(wrapped);
  }, [value]);

  // Integrated Web Speech API Hook
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    // Capture the existing text state before starting dictation
    baseTextRef.current = value.trim() ? value.trim() + " " : "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // 🔍 FIX: Set explicitly matching a flat base snapshot instead of compounding "prev" strings
      const spoken = finalTranscript || interimTranscript;
      if (spoken) {
        setText(baseTextRef.current + spoken);
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech Recognition Error", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!value.trim()) return;
    if (isListening) recognitionRef.current?.stop();
    onSubmit(value);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} className="relative w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className={[
            "flex items-center gap-3 w-full rounded-3xl px-4 py-2 border transition-shadow duration-200 ease-out relative overflow-visible",
            isWrapped ? "pb-16" : "",
            isDark
              ? focused
                ? `border-gray-600 bg-transparent ${styles.searchbarDarkGlow}`
                : `border-gray-700 bg-transparent ${styles.searchbarDarkGlow}`
              : `border-slate-300 bg-slate-100/85 ${styles.searchbarLightGlow}`,
          ].join(" ")}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              isListening ? "Listening to your voice..." : placeholder
            }
            className={[
              styles.textarea,
              isDark ? styles.textareaDark : styles.textareaLight,
              "flex-1 self-stretch outline-none resize-none bg-transparent text-base leading-6 min-h-10.5 max-h-[45vh] overflow-y-auto py-2",
              isWrapped ? "pr-4" : "pr-24",
              isDark ? "text-gray-100" : "text-gray-900",
            ].join(" ")}
          />

          <div
            className={
              "absolute " +
              (isWrapped ? "left-3 right-3 bottom-3" : "right-3 bottom-3")
            }
            style={{ zIndex: 50 }}
          >
            {/* 🔍 FIX: Changed prop name from onSubmit to onSend to map with PromptBarIcons expected parameters */}
            <PromptBarIcons
              onVoice={toggleSpeechRecognition}
              onSend={handleSubmit}
              isDark={isDark}
              fullWidth={isWrapped}
              isListening={isListening}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
