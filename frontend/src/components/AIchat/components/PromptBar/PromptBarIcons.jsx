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
  const touchTimerRef = useRef(null);
  const tooltipRefs = useRef({});
  const [models, setModels] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null);

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

  const updateTooltipPosition = (id) => {
    const el = tooltipRefs.current[id];
    const buttonEl = el?.parentElement;
    if (!el || !buttonEl) return;

    const btnRect = buttonEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const margin = 8;

    el.style.left = "";
    el.style.right = "";
    el.style.top = "";
    el.style.bottom = "";
    el.style.transform = "";

    const isNearTop = btnRect.top < 60;
    if (isNearTop) {
      el.style.top = "calc(100% + 8px)";
      el.style.bottom = "auto";
    } else {
      el.style.bottom = "calc(100% + 8px)";
      el.style.top = "auto";
    }

    el.style.left = "50%";
    el.style.right = "auto";

    const tooltipRect = el.getBoundingClientRect();
    if (tooltipRect.left < margin) {
      const offset = margin - tooltipRect.left;
      el.style.transform = `translateX(calc(-50% + ${offset}px))`;
    } else if (tooltipRect.right > viewportWidth - margin) {
      const offset = tooltipRect.right - (viewportWidth - margin);
      el.style.transform = `translateX(calc(-50% - ${offset}px))`;
    } else {
      el.style.transform = "translateX(-50%)";
    }
  };

  const handleMouseEnter = (id) => {
    updateTooltipPosition(id);
  };

  const handleTouchStart = (id) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setActiveTooltip(id);
      updateTooltipPosition(id);
    }, 300);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    setTimeout(() => setActiveTooltip(null), 1200);
  };

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  function triggerFog(elRef) {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove(styles.fogAnimate);
    void el.offsetWidth;
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
      {/* Left Side: Model Selector + Code Toggle */}
      <div className={styles.leftGroup}>
        <div
          className={styles.codeToggleContainer}
          onMouseEnter={() => handleMouseEnter("code")}
          onTouchStart={() => handleTouchStart("code")}
          onTouchEnd={handleTouchEnd}
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
          <span
            ref={(el) => (tooltipRefs.current["code"] = el)}
            className={`${styles.customTooltip} ${
              activeTooltip === "code" ? styles.showTouchTooltip : ""
            }`}
            role="tooltip"
          >
            {includeCode ? "Include Code Context" : "Exclude Code Context"}
          </span>
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

      {/* Right Side: Mic + Send Button */}
      <div className={styles.rightGroup}>
        <button
          ref={micRef}
          type="button"
          disabled={disabled}
          onClick={handleVoice}
          onTouchStart={() => handleTouchStart("mic")}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => handleMouseEnter("mic")}
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
          <span
            ref={(el) => (tooltipRefs.current["mic"] = el)}
            className={`${styles.customTooltip} ${
              activeTooltip === "mic" ? styles.showTouchTooltip : ""
            }`}
            role="tooltip"
          >
            {isListening ? "Stop voice input" : "Voice input"}
          </span>
        </button>

        <button
          ref={sendRef}
          type="button"
          disabled={disabled}
          onClick={handleSend}
          onTouchStart={() => handleTouchStart("send")}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => handleMouseEnter("send")}
          aria-label={disabled ? "Sending..." : "Send"}
          className={`${styles.capsuleBtn} ${styles.sendBtn} ${
            isDarkMode ? styles.sendDark : styles.sendLight
          }`}
        >
          <SendHorizontal className="w-5 h-5" />
          <span
            ref={(el) => (tooltipRefs.current["send"] = el)}
            className={`${styles.customTooltip} ${
              activeTooltip === "send" ? styles.showTouchTooltip : ""
            }`}
            role="tooltip"
          >
            {disabled ? "Sending..." : "Send prompt"}
          </span>
        </button>
      </div>
    </div>
  );
}
