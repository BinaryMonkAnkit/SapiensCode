import { useRef, useEffect, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import styles from "./PromptBarIcons.module.css";
import { LOTTIE_URLS } from "../../../../assets/assetConstants";
import ModelSelector from "./ModelSelector.jsx";
import { fetchAvailableModels } from "../../../../services/assistantService";

export default function PromptBarIcons({
  onVoice,
  onSend,
  isDarkMode,
  fullWidth = false,
  isListening = false,
  includeCode = true,
  setIncludeCode = () => {},
  disabled = false,
  isStreaming,
  selectedModel,
  setSelectedModel = () => {},
  voiceLottieUrl = LOTTIE_URLS.MIC_LISTENING,
}) {
  const micRef = useRef(null);
  const sendRef = useRef(null);
  const [models, setModels] = useState([]);

  useEffect(() => {
    async function loadModels() {
      try {
        const fetchedModels = await fetchAvailableModels();
        const modelList = Array.isArray(fetchedModels)
          ? fetchedModels
          : fetchedModels?.models || [];
        setModels(modelList);

        if (modelList.length > 0 && !selectedModel) {
          const defaultModel = modelList[0]?.id || modelList[0];
          setSelectedModel(defaultModel);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    }
    loadModels();
  }, []);

  function triggerFog(elRef) {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove(styles.fogAnimate);
    void el.offsetWidth; // Force reflow
    el.classList.add(styles.fogAnimate);
    window.setTimeout(() => el.classList.remove(styles.fogAnimate), 900);
  }

  function handleVoice() {
    if (disabled) return;
    triggerFog(micRef);
    onVoice?.();
  }

  function handleSend() {
    if (disabled) return;
    triggerFog(sendRef);
    onSend?.();
  }

  return (
    <div
      className={`${styles.iconCapsule} ${
        isDarkMode ? styles.darkTheme : styles.lightTheme
      }`}
      aria-hidden={false}
    >
      {/* Left Side: Model Selector + Mic */}
      <div className={styles.leftGroup}>
        <div
          className={styles.codeToggleContainer}
          data-tooltip={
            includeCode ? "Include Code Context" : "Exclude Code Context"
          }
        >
          <label className={styles.macToggleLabel}>
            <span className={styles.toggleText}>Code</span>
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(e) => setIncludeCode(e.target.checked)}
              disabled={disabled}
              className={styles.macToggleInput}
            />
            <span className={styles.macToggleTrack}>
              <span className={styles.macToggleThumb} />
            </span>
          </label>
        </div>

        <div className={styles.minimalModelWrapper}>
          <ModelSelector
            models={models}
            isDarkMode={isDarkMode}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Right Side: MacOS Toggle + Send Button */}
      <div className={styles.rightGroup}>
        <button
          ref={micRef}
          type="button"
          disabled={disabled}
          onClick={handleVoice}
          data-tooltip={isListening ? "Stop voice input" : "Voice input"}
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

        <button
          ref={sendRef}
          type="button"
          disabled={disabled}
          onClick={handleSend}
          data-tooltip={disabled ? "Sending..." : "Send prompt"}
          aria-label={disabled ? "Sending..." : "Send"}
          className={`${styles.capsuleBtn} ${styles.sendBtn} ${
            isDarkMode ? styles.sendDark : styles.sendLight
          }`}
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
