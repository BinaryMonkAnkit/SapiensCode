import { useRef } from "react";
import { SendHorizontal } from "lucide-react";

export default function PromptBarIcons({
  onVoice,
  onSend,
  isDark,
  fullWidth = false,
  isListening = false,
}) {
  const micRef = useRef(null);
  const sendRef = useRef(null);

  function triggerFog(elRef) {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove("fog-animate");
    void el.offsetWidth;
    el.classList.add("fog-animate");
    window.setTimeout(() => el.classList.remove("fog-animate"), 900);
  }

  function handleVoice() {
    triggerFog(micRef);
    if (typeof onVoice === "function") onVoice();
  }

  function handleSend() {
    triggerFog(sendRef);
    if (typeof onSend === "function") onSend();
  }

  return (
    <div
      className={
        "icon-capsule icon-capsule-horizontal" +
        (fullWidth ? " icon-capsule-full" : "")
      }
      aria-hidden={false}
      style={{ justifyContent: fullWidth ? "space-between" : "flex-end" }}
    >
      <button
        ref={micRef}
        type="button"
        onClick={handleVoice}
        aria-label={isListening ? "Stop Voice Listening" : "Voice Input"}
        className={`capsule-btn mic-btn ${isListening ? "mic-listening" : ""}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
          <path d="M17.3 12a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.93V22h2v-3.07A7 7 0 0 0 19 12h-1.7Z" />
        </svg>
      </button>

      <div className="capsule-divider" />

      <button
        ref={sendRef}
        type="button"
        onClick={handleSend}
        aria-label="Send"
        className={
          "capsule-btn send-btn " + (isDark ? "send-dark" : "send-light")
        }
      >
        <SendHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
}
