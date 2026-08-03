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

  const shouldListenRef = useRef(false);
  const baseTextRef = useRef("");
  const finalSpeechRef = useRef("");

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

  const stopListening = () => {
    shouldListenRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);

    if (textareaRef.current) {
      setText(textareaRef.current.value);
    }
  };

  const startListeningSession = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const recognition = new SpeechRecognition();

    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalSpeechRef.current += chunk.trim() + " ";
        } else {
          currentInterim += chunk;
        }
      }

      const completeText =
        baseTextRef.current + finalSpeechRef.current + currentInterim;

      if (textareaRef.current) {
        textareaRef.current.value = completeText;
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.max(
          textareaRef.current.scrollHeight,
          42,
        )}px`;
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech Recognition Error:", err);
      stopListening();
    };

    recognition.onend = () => {
      if (shouldListenRef.current && !isMobile) {
        try {
          startListeningSession();
        } catch (e) {
          console.error("Restart failed:", e);
          stopListening();
        }
      } else {
        stopListening();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Session start error:", e);
      stopListening();
    }
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (shouldListenRef.current) {
      stopListening();
      return;
    }

    textareaRef.current?.blur();

    shouldListenRef.current = true;
    baseTextRef.current = textareaRef.current?.value
      ? textareaRef.current.value.trim() + " "
      : "";
    finalSpeechRef.current = "";

    startListeningSession();
  };

  function handleSubmit(e) {
    if (e) e.preventDefault();

    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      ("ontouchstart" in window && navigator.maxTouchPoints > 0);

    // Guard: Prevent native soft keyboard "Enter" submit events while focused in textarea on mobile
    if (
      isMobile &&
      e &&
      e.type === "submit" &&
      document.activeElement === textareaRef.current
    ) {
      return;
    }

    const currentVal = textareaRef.current ? textareaRef.current.value : value;
    if (!currentVal.trim()) return;

    stopListening();
    onSubmit(currentVal);
    setText("");
    if (textareaRef.current) textareaRef.current.value = "";
    baseTextRef.current = "";
    finalSpeechRef.current = "";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      const isMobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        ("ontouchstart" in window && navigator.maxTouchPoints > 0);

      if (isMobile) {
        // Allow mobile soft keyboard Enter key to default to adding a new line (\n)
        return;
      }

      // Desktop behavior: Enter sends message, Shift+Enter creates a new line
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
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
            enterKeyHint="enter"
            onChange={(e) => {
              const newValue = e.target.value;
              setText(newValue);
              baseTextRef.current = newValue;
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
