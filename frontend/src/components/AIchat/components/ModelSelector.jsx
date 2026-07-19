import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./ModelSelector.module.css";

export default function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  isStreaming,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- 1. HOOKS MUST COME FIRST BEFORE ANY CONDITIONAL RETURNS ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 2. NOW IT IS SAFE TO RETURN EARLY IF DATA IS MISSING ---
  if (!models || models.length === 0) return null;

  const currentModelObj =
    models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div className={styles["model-selector-container"]} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={isStreaming}
        className={`${styles["model-capsule-wrapper"]} ${isOpen ? styles["active"] : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles["selected-text"]}>{currentModelObj?.name}</span>
        <ChevronDown
          size={14}
          className={`${styles["select-arrow-icon"]} ${isOpen ? styles["rotated"] : ""}`}
        />
      </button>

      {/* Blurry Custom Dropdown Menu List */}
      {isOpen && (
        <ul className={styles["dropdown-list-menu"]}>
          {models.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                className={`${styles["dropdown-item-btn"]} ${
                  model.id === selectedModel ? styles["selected-item"] : ""
                }`}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
              >
                {model.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
