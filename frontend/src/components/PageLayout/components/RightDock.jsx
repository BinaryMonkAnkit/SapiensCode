import { useEffect, useRef, useState } from "react";
import {
  Grid,
  Sparkles,
  SquareCode,
  BookOpenText,
  Moon,
  Sun,
} from "lucide-react";
import styles from "./RightDock.module.css";

const DOCK_ICONS = [Sparkles, SquareCode, BookOpenText];
const DOCK_LABELS_FALLBACK = ["Chat", "Editor", "Docs"];

export default function RightDock({
  activeIdx,
  sections,
  onDotClick,
  isDarkMode,
  onToggleTheme,
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const touchTimerRef = useRef(null);

  const handleTouchStart = (id) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveTooltip(id);
    }, 300); // Trigger tooltip on hold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    setTimeout(() => setActiveTooltip(null), 1200); // Hide after release
  };

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  return (
    <aside className={styles["right-dock"]}>
      {/* Menu / Grid Icon */}
      <button
        type="button"
        className={`${styles["dock-btn"]} ${styles["dock-icon-btn"]}`}
        onTouchStart={() => handleTouchStart("menu")}
        onTouchEnd={handleTouchEnd}
        aria-label="Menu"
      >
        <Grid size={18} />
        <span
          className={`${styles["dock-tooltip"]} ${
            activeTooltip === "menu" ? styles["show-touch-tooltip"] : ""
          }`}
          role="tooltip"
        >
          Menu
        </span>
      </button>

      {/* Section Navigation Icons */}
      <div className={styles["dots-column"]}>
        {sections.map((section, idx) => {
          const Icon = DOCK_ICONS[idx % DOCK_ICONS.length];
          const label =
            section.label || DOCK_LABELS_FALLBACK[idx] || section.id;
          const isActive = activeIdx === idx;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onDotClick(idx)}
              onTouchStart={() => handleTouchStart(section.id)}
              onTouchEnd={handleTouchEnd}
              className={`${styles["dock-icon-btn"]} ${
                isActive ? styles["dock-icon-active"] : ""
              }`}
              aria-label={label}
              aria-current={isActive ? "true" : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              <span
                className={`${styles["dock-tooltip"]} ${
                  activeTooltip === section.id
                    ? styles["show-touch-tooltip"]
                    : ""
                }`}
                role="tooltip"
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Theme Toggle Icon */}
      <div className={styles["dock-bottom"]}>
        <button
          type="button"
          onClick={onToggleTheme}
          onTouchStart={() => handleTouchStart("theme")}
          onTouchEnd={handleTouchEnd}
          className={`${styles["theme-toggle-btn"]} ${styles["dock-icon-btn"]}`}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span
            className={`${styles["dock-tooltip"]} ${
              activeTooltip === "theme" ? styles["show-touch-tooltip"] : ""
            }`}
            role="tooltip"
          >
            {isDarkMode ? "Light mode" : "Dark mode"}
          </span>
        </button>
      </div>
    </aside>
  );
}
