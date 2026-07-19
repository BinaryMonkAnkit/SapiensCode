import { useState, useRef, useLayoutEffect } from "react";
import PromptBarIcons from "./PromptBarIcons";

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
                ? "border-gray-600 bg-transparent searchbar-dark-glow"
                : "border-gray-700 bg-transparent searchbar-dark-glow"
              : "border-slate-300 bg-slate-100/85 searchbar-light-glow",
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
              "gsb-textarea flex-1 self-stretch outline-none resize-none bg-transparent text-base leading-6 min-h-10.5 max-h-60 overflow-y-auto py-2",
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

      <style>{`
        .gsb-textarea::-webkit-scrollbar { width: 6px; }
        .gsb-textarea::-webkit-scrollbar-track { background: transparent; }
        .gsb-textarea::-webkit-scrollbar-thumb {
          background-color: ${isDark ? "rgba(232,234,237,0.25)" : "rgba(32,33,36,0.22)"};
          border-radius: 999px;
        }
        .gsb-textarea::-webkit-scrollbar-thumb:hover {
          background-color: ${isDark ? "rgba(232,234,237,0.45)" : "rgba(32,33,36,0.4)"};
        }
        .gsb-textarea {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? "rgba(232,234,237,0.25)" : "rgba(32,33,36,0.22)"} transparent;
        }

        .searchbar-light-glow {
          box-shadow: 0 10px 70px rgba(56, 139, 253, 0.16);
          background: rgba(248, 250, 252, 0.94);
        }

        .searchbar-light-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 20%, rgba(56, 139, 253, 0.28), transparent 40%);
          opacity: 0.3;
          animation: searchbar-blue-glow 3.6s ease-in-out infinite;
        }

        @keyframes searchbar-blue-glow {
          0%, 100% { opacity: 0.32; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.06); }
        }

        .searchbar-dark-glow {
          box-shadow: 0 12px 90px rgba(56, 139, 253, 0.28), 0 2px 12px rgba(14, 165, 233, 0.08) inset;
        }
        .searchbar-dark-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 20%, rgba(56, 139, 253, 0.34), transparent 35%);
          opacity: 0.42;
          animation: searchbar-blue-glow 3.2s ease-in-out infinite;
        }

        .icon-capsule {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          justify-content: flex-end;
          max-width: 100%;
        }
        .icon-capsule-horizontal { flex-direction: row; }
        .icon-capsule-full { width: 100%; justify-content: flex-end; }

        .capsule-btn {
          position: relative;
          background: transparent;
          border: none;
          padding: 8px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.12s ease, opacity 0.12s ease;
          color: inherit;
        }
        .capsule-btn svg { position: relative; z-index: 2; }
        .capsule-btn::before {
          content: "";
          position: absolute;
          inset: -10px;
          border-radius: 14px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(56,139,253,0.18), transparent 40%);
          opacity: 0;
          filter: blur(18px);
          transition: opacity 0.24s ease, transform 0.24s ease;
          z-index: 0;
        }
        .capsule-btn:focus { outline: none; box-shadow: none; }
        .capsule-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.14); }
        .capsule-btn:hover { transform: translateY(-1px); }
        .capsule-btn:active { transform: scale(0.92); }
        
        /* Mic Recording Voice Wave Effect Indicator */
        .mic-listening {
          color: #ef4444 !important;
          animation: mic-pulse 1.4s ease-in-out infinite alternate;
        }
        .mic-listening::before {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.4), transparent 70%);
          opacity: 1;
          filter: blur(4px);
          animation: voice-wave 1.2s infinite ease-in-out;
          z-index: 1;
        }

        @keyframes mic-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.12); }
        }
        @keyframes voice-wave {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(2.1); opacity: 0; }
        }

        .capsule-btn::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 12px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(56,139,253,0.24), transparent 45%);
          opacity: 0;
          filter: blur(14px);
          transition: opacity 0.22s ease, transform 0.22s ease;
          z-index: 0;
        }
        .capsule-btn:active::after { opacity: 0.8; transform: scale(1.4); }
 
        .capsule-divider { width: 1px; height: 22px; background: rgba(0,0,0,0.06); border-radius: 2px; }
        .icon-capsule-vertical .capsule-divider { width: 100%; height: 1px; }
 
        .send-btn { position: relative; }
        .send-light::after, .send-dark::after { content: ""; position: absolute; inset: -8px; border-radius: 10px; z-index: 0; filter: blur(16px); transition: transform 0.24s ease, opacity 0.24s ease; opacity: 0.75; }
        .send-light::after { background: radial-gradient(circle, rgba(59,130,246,0.28), transparent 40%); }
        .send-dark::after { background: radial-gradient(circle, rgba(56,139,253,0.45), transparent 35%); }
        .send-light:hover::after { transform: scale(1.14); opacity: 1; }
        .send-dark:hover::after { transform: scale(1.16); opacity: 1; }
        .send-btn:active { transform: scale(0.9); }
        .send-btn:active::after { opacity: 0.95; transform: scale(1.55); }

        @keyframes fog-expand {
          0% { opacity: 0.95; transform: scale(0.8); }
          35% { opacity: 0.75; transform: scale(1.4); }
          100% { opacity: 0; transform: scale(2.8); }
        }
        @keyframes fog-expand-slow {
          0% { opacity: 0.85; transform: scale(0.9) rotate(0deg); }
          50% { opacity: 0.55; transform: scale(1.9) rotate(6deg); }
          100% { opacity: 0; transform: scale(3.6) rotate(12deg); }
        }

        .fog-animate::after {
          animation: fog-expand 820ms cubic-bezier(.16,.8,.32,1) forwards;
          opacity: 0.95;
          filter: blur(20px);
          transform-origin: 50% 50%;
        }
        .fog-animate::before {
          animation: fog-expand-slow 1100ms cubic-bezier(.2,.8,.24,1) forwards;
          opacity: 0.9;
          filter: blur(26px);
        }

        .fog-animate.send-light::after {
          background: radial-gradient(circle at 50% 40%, rgba(59,130,246,0.46), rgba(59,130,246,0.14) 35%, transparent 60%);
        }
        .fog-animate.send-light::before {
          background: radial-gradient(circle at 50% 30%, rgba(59,130,246,0.26), transparent 40%);
        }
        .fog-animate.send-dark::after {
          background: radial-gradient(circle at 50% 40%, rgba(56,139,253,0.75), rgba(56,139,253,0.28) 35%, transparent 55%);
        }
        .fog-animate.send-dark::before {
          background: radial-gradient(circle at 50% 30%, rgba(56,139,253,0.42), transparent 40%);
        }

        .gsb-textarea::placeholder { color: ${isDark ? "rgba(148,163,184,0.9)" : "rgba(107,114,128,1)"}; opacity: 1; }
      `}</style>
    </div>
  );
}
