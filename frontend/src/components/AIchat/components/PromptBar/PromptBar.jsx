import { useState, useRef, useLayoutEffect } from "react";
import PromptBarIcons from "./PromptBarIcons";
import styles from "./PromptBar.module.css";

export default function PromptBar({
  placeholder = "Ask your query to get help from an AI.",
  onSubmit = () => {},
  isDarkMode,
  onLayoutChange = () => {},
}) {
  const [value, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isWrapped, setIsWrapped] = useState(false);

  const baseTextRef = useRef("");

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const wrapped = el.scrollHeight > lineHeight * 1.1;

    setIsWrapped(wrapped);

    requestAnimationFrame(onLayoutChange);
  }, [value, onLayoutChange]);

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
      {/* Hidden SVG Filter Definition */}
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <filter
          id="promptBarGlassFilter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          {/* Heavy Gaussian dispersion */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
          {/* Color Matrix to wash out high contrast white text edges */}
          <feColorMatrix
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      <div ref={containerRef} className="relative w-full max-w-xl">
        {/* Visual Glass Backdrop */}
        <div
          className={[
            styles.glassBackdrop,
            isDarkMode ? styles.backdropDark : styles.backdropLight,
          ].join(" ")}
        />

        {/* Interactive Form */}
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
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              isListening ? "Listening to your voice..." : placeholder
            }
            className={[
              styles.textarea,
              isDarkMode ? styles.textareaDark : styles.textareaLight,
              "flex-1 self-stretch outline-none resize-none bg-transparent text-base leading-6 min-h-10.5 max-h-[45vh] overflow-y-auto py-2",
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
            />
          </div>
        </form>
      </div>
    </div>
  );
}
