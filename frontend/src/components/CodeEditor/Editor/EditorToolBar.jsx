import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Square } from "lucide-react";
import styles from "./EditorToolBar.module.css";
import {
  python,
  js,
  c,
  cpp,
  java,
} from "../../../assets/programmingLang/langSVG/LangIconExporter.js";

export const LANGUAGES = [
  {
    value: "py",
    label: "Python",
    monacoLang: "python",
    icon: python,
  },
  {
    value: "js",
    label: "JavaScript",
    monacoLang: "javascript",
    icon: js,
  },
  {
    value: "java",
    label: "Java",
    monacoLang: "java",
    icon: java,
  },
  {
    value: "c",
    label: "C",
    monacoLang: "c",
    icon: c,
  },
  {
    value: "cpp",
    label: "C++",
    monacoLang: "cpp",
    icon: cpp,
  },
];

const EditorToolbar = ({
  isDarkMode,
  language,
  setLanguage,
  isRunning,
  isConnected,
  onRun,
  onStop,
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    direction: "down",
  });
  const langWrapRef = useRef(null);
  const langButtonRef = useRef(null);
  const langMenuRef = useRef(null);

  // 1. Handle outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedTrigger =
        langWrapRef.current && langWrapRef.current.contains(e.target);
      const clickedMenu =
        langMenuRef.current && langMenuRef.current.contains(e.target);
      if (!clickedTrigger && !clickedMenu) {
        setIsLangOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // 2. Automatically close menu on ANY scroll/wheel/touchmove outside the dropdown menu
  useEffect(() => {
    if (!isLangOpen) return;

    const handleDismissOnScroll = (event) => {
      // Don't close if scrolling happens INSIDE the dropdown options list itself
      if (langMenuRef.current && langMenuRef.current.contains(event.target)) {
        return;
      }
      setIsLangOpen(false);
    };

    // 'true' uses capture phase to catch scrolls on any nested container or main window
    window.addEventListener("scroll", handleDismissOnScroll, true);
    window.addEventListener("wheel", handleDismissOnScroll, true);
    window.addEventListener("touchmove", handleDismissOnScroll, true);
    window.addEventListener("resize", handleDismissOnScroll);

    return () => {
      window.removeEventListener("scroll", handleDismissOnScroll, true);
      window.removeEventListener("wheel", handleDismissOnScroll, true);
      window.removeEventListener("touchmove", handleDismissOnScroll, true);
      window.removeEventListener("resize", handleDismissOnScroll);
    };
  }, [isLangOpen]);

  // 3. Compute menu position when opened
  useLayoutEffect(() => {
    if (!isLangOpen || !langButtonRef.current) return;

    const updatePosition = () => {
      const rect = langButtonRef.current.getBoundingClientRect();
      const menuEstimatedHeight = Math.min(LANGUAGES.length * 36 + 12, 260);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const openUp =
        spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow;

      setMenuPos({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        direction: openUp ? "up" : "down",
      });
    };

    updatePosition();
  }, [isLangOpen]);

  const currentLanguage = LANGUAGES.find((lang) => lang.value === language);
  const currentLanguageLabel = currentLanguage?.label || "Select";

  return (
    <div data-theme={isDarkMode ? "dark" : "light"} className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <span
          className={styles.statusDot}
          data-connected={isConnected}
          title={
            isConnected ? "connected to backend" : "not connected to backend"
          }
        />
        <div className={styles.selectWrap} ref={langWrapRef}>
          <button
            type="button"
            ref={langButtonRef}
            className={styles.select}
            onClick={() => !isRunning && setIsLangOpen((prev) => !prev)}
            disabled={isRunning}
            aria-haspopup="listbox"
            aria-expanded={isLangOpen}
            aria-label="Programming language"
          >
            {currentLanguage && (
              <currentLanguage.icon className={styles.langIcon} />
            )}

            <span className={styles.selectLabel}>{currentLanguageLabel}</span>
            <span
              className={styles.selectArrow}
              style={{
                transform: isLangOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 10L12 15L17 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          {isLangOpen &&
            createPortal(
              <ul
                data-theme={isDarkMode ? "dark" : "light"}
                ref={langMenuRef}
                className={styles.selectMenu}
                role="listbox"
                data-direction={menuPos.direction}
                style={{
                  position: "fixed",
                  top: menuPos.direction === "up" ? "auto" : menuPos.top,
                  bottom:
                    menuPos.direction === "up"
                      ? window.innerHeight - menuPos.top
                      : "auto",
                  left: menuPos.left,
                  width: menuPos.width,
                  zIndex: 9999,
                  maxHeight: "260px",
                  overflowY: "auto",
                  backgroundColor:
                    "var(--menu-bg-translucent, rgba(150, 150, 150, 0.15))",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border:
                    "1px solid var(--menu-border-translucent, rgba(128, 128, 128, 0.2))",
                  boxShadow:
                    "var(--menu-shadow, 0 8px 32px rgba(0, 0, 0, 0.12))",
                }}
              >
                {LANGUAGES.map((lang) => {
                  const isActive = lang.value === language;
                  const IconComponent = lang.icon;

                  return (
                    <li
                      key={lang.value}
                      role="option"
                      aria-selected={isActive}
                      className={`${styles.selectOption} ${
                        isActive ? styles.selectOptionActive : ""
                      }`}
                      onClick={() => {
                        setLanguage(lang.value);
                        setIsLangOpen(false);
                      }}
                    >
                      <span
                        className={styles.selectDot}
                        data-active={isActive}
                      />

                      <IconComponent className={styles.langIcon} />

                      <span className={styles.selectOptionLabel}>
                        {lang.label}
                      </span>
                    </li>
                  );
                })}
              </ul>,
              document.body,
            )}
        </div>
      </div>

      {/* Right items */}
      <div className={styles.toolbarRight}>
        <span className={styles.shortcutHint}>⌘/Ctrl + ⏎ to run</span>
        <button
          className={isRunning ? styles.stopBtn : styles.runBtn}
          onClick={isRunning ? onStop : onRun}
        >
          {isRunning ? (
            <Square className={styles["stop-iconShadow"]} />
          ) : (
            <Play className={styles["run-iconShadow"]} />
          )}
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
