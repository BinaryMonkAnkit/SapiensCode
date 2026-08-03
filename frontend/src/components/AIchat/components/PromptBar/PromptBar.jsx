import { useState, useRef, useLayoutEffect, useEffect } from "react";
import PromptBarIcons from "./PromptBarIcons";
import styles from "./PromptBar.module.css";

export default function PromptBar({
  placeholder = "Ask a question, analyze code, or brainstorm...",
  onSubmit = () => {},
  isDarkMode,
  disabled,
  includeCode = true,
  isStreaming,
  setIncludeCode = () => {},
  selectedModel,
  setSelectedModel,
  onLayoutChange = () => {},
}) {
  const [value, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isWrapped, setIsWrapped] = useState(false);

  // Tracks text existing BEFORE speech started
  const initialTextRef = useRef("");
  // Tracks all accumulated FINAL transcripts recorded during current voice session
  const accumulatedFinalRef = useRef("");

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const newHeight = Math.max(el.scrollHeight, 42);
    el.style.height = `${newHeight}px`;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const wrapped = el.scrollHeight > lineHeight * 1.5;

    setIsWrapped(wrapped);
    requestAnimationFrame(onLayoutChange);
  }, [value, placeholder, onLayoutChange]);

  useEffect(() => {
    const handleResize = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 42)}px`;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Capture baseline text before speech recognition starts
    initialTextRef.current = value.trim() ? value.trim() + " " : "";
    accumulatedFinalRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentSessionFinal = "";
      let interimTranscript = "";

      // Walk through ALL results from index 0 to ensure zero lost chunks
      for (let i = 0; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentSessionFinal += transcriptChunk + " ";
        } else {
          interimTranscript += transcriptChunk;
        }
      }

      // Store final speech chunks
      accumulatedFinalRef.current = currentSessionFinal;

      // Combine baseline text + all finalized speech + current live interim speech
      const completeText =
        initialTextRef.current +
        accumulatedFinalRef.current +
        interimTranscript;

      setText(completeText);
    };

    recognition.onerror = (err) => {
      console.error("Speech Recognition Error:", err);
      // Ignore non-fatal audio-capture/no-speech warnings
      if (err.error !== "no-speech" && err.error !== "audio-capture") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!value.trim()) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSubmit(value);
    setText("");
    initialTextRef.current = "";
    accumulatedFinalRef.current = "";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className={styles.promptBarWrapper}>
      <div ref={containerRef} className={styles.promptBarContainer}>
        <div
          className={[
            styles.glassBackdrop,
            isDarkMode ? styles.backdropDark : styles.backdropLight,
          ].join(" ")}
        />

        <form
          onSubmit={handleSubmit}
          className={[
            "flex items-center gap-3 w-full rounded-3xl px-4 py-2 relative z-10",
            isWrapped ? "pb-16" : "",
          ].join(" ")}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              setText(newValue);
              initialTextRef.current = newValue;
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              isListening ? "Listening to your voice..." : placeholder
            }
            className={[
              styles.textarea,
              isDarkMode ? styles.textareaDark : styles.textareaLight,
              "flex-1 self-stretch outline-none resize-none bg-transparent text-base leading-6 min-h-10.5 max-h-[45vh] py-2",
              isWrapped ? "pr-4" : "pr-24",
              isDarkMode ? "text-gray-100" : "text-gray-900",
            ].join(" ")}
          />

          <div
            className={
              "absolute " +
              (isWrapped ? "left-3 right-3 bottom-3" : "right-3 bottom-3")
            }
            style={{ zIndex: 50 }}
          >
            <PromptBarIcons
              onVoice={toggleSpeechRecognition}
              onSend={handleSubmit}
              isDarkMode={isDarkMode}
              fullWidth={isWrapped}
              isListening={isListening}
              includeCode={includeCode}
              setIncludeCode={setIncludeCode}
              isStreaming={isStreaming}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
