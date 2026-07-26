import { useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import styles from "./PromptBarIcons.module.css";
import { LOTTIE_URLS } from "../../../../assets/assetConstants";

export default function PromptBarIcons({
  onVoice,
  onSend,
  isDarkMode,
  fullWidth = false,
  isListening = false,
  voiceLottieUrl = LOTTIE_URLS.MIC_LISTENING, // pass your .lottie url in here
}) {
  const micRef = useRef(null);
  const sendRef = useRef(null);
  console.log("isDarkMode value:", isDarkMode);

  function triggerFog(elRef) {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove(styles.fogAnimate);
    void el.offsetWidth; // Force reflow
    el.classList.add(styles.fogAnimate);
    window.setTimeout(() => el.classList.remove(styles.fogAnimate), 900);
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
      className={`${styles.iconCapsule} ${styles.iconCapsuleHorizontal} ${
        fullWidth ? styles.iconCapsuleFull : ""
      }`}
      aria-hidden={false}
      style={{ justifyContent: fullWidth ? "space-between" : "flex-end" }}
    >
      <button
        ref={micRef}
        type="button"
        onClick={handleVoice}
        aria-label={isListening ? "Stop Voice Listening" : "Voice Input"}
        className={`${styles.capsuleBtn} ${styles.micBtn} ${
          isListening
            ? `${styles.micActive} ${
                isDarkMode ? styles.micActiveDark : styles.micActiveLight
              }`
            : ""
        }`}
        style={isListening ? { padding: 0 } : undefined}
      >
        {isListening ? (
          <span className={styles.lottieWrap}>
            <DotLottieReact
              src={voiceLottieUrl}
              loop
              autoplay
              style={{
                width: "72px",
                height: "36px",
                filter: isDarkMode
                  ? "brightness(0) saturate(100%) invert(1)"
                  : "brightness(0) saturate(100%)",
              }}
            />
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            <path d="M17.3 12a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.93V22h2v-3.07A7 7 0 0 0 19 12h-1.7Z" />
          </svg>
        )}
      </button>

      <div className={styles.capsuleDivider} />

      <button
        ref={sendRef}
        type="button"
        onClick={handleSend}
        aria-label="Send"
        className={`${styles.capsuleBtn} ${styles.sendBtn} ${
          isDarkMode ? styles.sendDark : styles.sendLight
        }`}
      >
        <SendHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
}
