import {
  Grid,
  Sparkles,
  SquareCode,
  BookOpenText,
  Moon,
  Sun,
} from "lucide-react";
import styles from "../MainLayout.module.css";

const DOCK_ICONS = [Sparkles, SquareCode, BookOpenText];
const DOCK_LABELS_FALLBACK = ["Chat", "Editor", "Docs"];

export default function RightDock({
  activeIdx,
  sections,
  onDotClick,
  isDarkMode,
  onToggleTheme,
}) {
  return (
    <aside className={styles["right-dock"]}>
      <button type="button" className={`${styles["dock-btn"]} group-btn`}>
        <Grid size={18} />
      </button>

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
              className={`${styles["dock-icon-btn"]} ${
                isActive ? styles["dock-icon-active"] : ""
              }`}
              aria-label={`Jump to ${label}`}
              aria-current={isActive ? "true" : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              <span className={styles["dock-tooltip"]} role="tooltip">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles["dock-bottom"]}>
        <button
          type="button"
          onClick={onToggleTheme}
          className={styles["theme-toggle-btn"]}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  );
}
