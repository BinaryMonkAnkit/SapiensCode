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
  const tooltipRefs = useRef({});
  const dockRef = useRef(null);

  const updateTooltipPosition = (id) => {
    const el = tooltipRefs.current[id];
    const buttonEl = el?.parentElement;
    if (!el || !buttonEl) return;

    const btnRect = buttonEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    // Determine orientation based on window size / layout (Mobile threshold 768px)
    const isHorizontalLayout = viewportWidth <= 768;

    el.dataset.placement = "";
    el.style.left = "";
    el.style.right = "";
    el.style.top = "";
    el.style.bottom = "";
    el.style.transform = "";

    if (isHorizontalLayout) {
      // Mobile / Horizontal layout
      const isDockAtBottom = btnRect.top > viewportHeight / 2;

      if (isDockAtBottom) {
        // Position above the icon
        el.dataset.placement = "top";
        el.style.bottom = "calc(100% + 8px)";
        el.style.top = "auto";
      } else {
        // Position below the icon
        el.dataset.placement = "bottom";
        el.style.top = "calc(100% + 8px)";
        el.style.bottom = "auto";
      }

      // Center horizontally relative to button
      el.style.left = "50%";
      el.style.right = "auto";

      // Prevent clipping left/right edges
      const tooltipRect = el.getBoundingClientRect();
      let shiftX = -50;

      if (tooltipRect.left < margin) {
        const offset = margin - tooltipRect.left;
        el.style.transform = `translateX(calc(-50% + ${offset}px))`;
      } else if (tooltipRect.right > viewportWidth - margin) {
        const offset = tooltipRect.right - (viewportWidth - margin);
        el.style.transform = `translateX(calc(-50% - ${offset}px))`;
      } else {
        el.style.transform = `translateX(-50%)`;
      }
    } else {
      // Desktop / Vertical layout (Dock on Right side -> Tooltip on Left)
      el.dataset.placement = "left";
      el.style.right = "calc(100% + 8px)";
      el.style.top = "50%";
      el.style.transform = "translateY(-50%)";
    }
  };

  const handleMouseEnter = (id) => {
    updateTooltipPosition(id);
  };

  const handleTouchStart = (id) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveTooltip(id);
      updateTooltipPosition(id);
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
    <aside ref={dockRef} className={styles["right-dock"]}>
      {/* Menu / Grid Icon */}
      <button
        type="button"
        className={`${styles["dock-btn"]} ${styles["dock-icon-btn"]}`}
        onMouseEnter={() => handleMouseEnter("menu")}
        onTouchStart={() => handleTouchStart("menu")}
        onTouchEnd={handleTouchEnd}
        aria-label="Menu"
      >
        <Grid size={18} />
        <span
          ref={(el) => (tooltipRefs.current["menu"] = el)}
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
              onMouseEnter={() => handleMouseEnter(section.id)}
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
                ref={(el) => (tooltipRefs.current[section.id] = el)}
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
          onMouseEnter={() => handleMouseEnter("theme")}
          onTouchStart={() => handleTouchStart("theme")}
          onTouchEnd={handleTouchEnd}
          className={`${styles["theme-toggle-btn"]} ${styles["dock-icon-btn"]}`}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span
            ref={(el) => (tooltipRefs.current["theme"] = el)}
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
