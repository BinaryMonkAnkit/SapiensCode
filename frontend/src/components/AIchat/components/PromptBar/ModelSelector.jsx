import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import styles from "./ModelSelector.module.css";

export default function ModelSelector({
  models = [],
  selectedModel,
  onModelChange,
  isStreaming,
  isDarkMode = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        top: rect.top - 8,
        left: rect.left,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close menu instantly on ANY scroll, wheel, or swipe outside the dropdown list
  useEffect(() => {
    if (!isOpen) return;

    const handleDismissOnScroll = (event) => {
      // Don't close if the user is scrolling inside the actual dropdown menu list
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };

    // 'true' forces capture phase so nested divs (like chat workspace/lane) trigger this instantly
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
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!models || models.length === 0) return null;

  const currentModelObj =
    models.find((m) => m.id === selectedModel) || models[0];

  const getShortName = (name = "") => {
    if (!name) return "Model";
    const firstWord = name.split(/[\s-(]/)[0];
    return firstWord || name;
  };

  return (
    <div
      className={`${styles.container} ${
        isDarkMode ? styles.darkTheme : styles.lightTheme
      }`}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={isStreaming}
        className={`${styles.capsuleWrapper} ${isOpen ? styles.active : ""}`}
        onClick={handleToggle}
        title={currentModelObj?.name}
      >
        <span className={styles.selectedText}>
          {getShortName(currentModelObj?.name)}
        </span>
        <ChevronDown
          size={13}
          className={`${styles.arrowIcon} ${isOpen ? styles.rotated : ""}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            className={`${styles.selectMenu} ${
              isDarkMode ? styles.darkTheme : styles.lightTheme
            }`}
            style={{
              top: `${menuStyle.top}px`,
              left: `${menuStyle.left}px`,
            }}
          >
            {models.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <li
                  key={model.id}
                  className={`${styles.selectOption} ${
                    isSelected ? styles.selectOptionActive : ""
                  }`}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                >
                  <span className={styles.selectOptionLabel}>{model.name}</span>
                  {isSelected && (
                    <Check size={14} className={styles.checkIcon} />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
