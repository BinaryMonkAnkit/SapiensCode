import { useEffect, useRef, useState } from "react";
import { MessageSquare, Code, FileText } from "lucide-react";
import styles from "./MainLayout.module.css";
import AmbientBackground from "./components/AmbientBackground";
import SectionCard from "./components/SectionCard";
import RightDock from "./components/RightDock";
import Documentation from "../Documentation/Documentation";
import ChatUI from "../AIchat/ChatUI";
import CodeWorkspace from "../CodeEditor/CodeWorkspace";

const SCROLL_CONFIG = {
  sectionChangeCooldown: 700,
  innerScrollLeakyDelay: 350,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Separate DOM traversals for vertical vs horizontal scroll ancestors
const getScrollableAncestorY = (el, boundary) => {
  let node = el;
  while (node && node !== boundary && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canScrollY =
        /(auto|scroll)/.test(style.overflowY) &&
        node.scrollHeight > node.clientHeight + 1;
      if (canScrollY) return node;
    }
    node = node.parentElement;
  }
  return null;
};

const getScrollableAncestorX = (el, boundary) => {
  let node = el;
  while (node && node !== boundary && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canScrollX =
        /(auto|scroll)/.test(style.overflowX) &&
        node.scrollWidth > node.clientWidth + 1;
      if (canScrollX) return node;
    }
    node = node.parentElement;
  }
  return null;
};

export default function MainLayout() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const isTransitioningRef = useRef(false);
  const innerScrollCooldownRef = useRef(false);
  const innerScrollTimeoutRef = useRef(null);
  const viewportRef = useRef(null);

  const getEditorCodeRef = useRef(null);

  const SECTIONS = [
    {
      id: "chat",
      icon: MessageSquare,
      content: (isDarkMode) => (
        <ChatUI isDarkMode={isDarkMode} getEditorCodeRef={getEditorCodeRef} />
      ),
    },
    {
      id: "editor",
      icon: Code,
      content: (isDarkMode) => (
        <CodeWorkspace
          isDarkMode={isDarkMode}
          getEditorCodeRef={getEditorCodeRef}
        />
      ),
    },
    {
      id: "docs",
      icon: FileText,
      content: (isDarkMode) => <Documentation isDarkMode={isDarkMode} />,
      hideChrome: true,
    },
  ];

  const maxIndex = SECTIONS.length - 1;
  const clampIndex = (value) => clamp(value, 0, maxIndex);

  const changeSection = (nextIndex) => {
    const target = clampIndex(nextIndex);
    setActiveIdx((current) => {
      if (target === current) return current;

      isTransitioningRef.current = true;
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, SCROLL_CONFIG.sectionChangeCooldown);

      return target;
    });
  };

  const goToSection = (index) => {
    changeSection(index);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    let globalScrollTimeout = null;

    const handleWheel = (e) => {
      clearTimeout(globalScrollTimeout);
      globalScrollTimeout = setTimeout(() => {
        innerScrollCooldownRef.current = false;
        isTransitioningRef.current = false;
      }, 200);

      const isSmallScreen = window.innerWidth <= 768;

      if (isSmallScreen) {
        // --- MOBILE/SMALL SCREEN LOGIC (Horizontal Section Transitions) ---
        const effectiveDeltaX =
          Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const isVerticalDominant = Math.abs(e.deltaY) > Math.abs(e.deltaX);

        if (isVerticalDominant) {
          const scrollYEl = getScrollableAncestorY(e.target, viewport);
          if (scrollYEl) {
            innerScrollCooldownRef.current = true;
            clearTimeout(innerScrollTimeoutRef.current);
            return;
          }
        }

        const scrollXEl = getScrollableAncestorX(e.target, viewport);
        if (scrollXEl) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollXEl;
          const atLeft = scrollLeft <= 0;
          const atRight = scrollLeft + clientWidth >= scrollWidth - 1;
          const scrollingRight = effectiveDeltaX > 0;
          const scrollingLeft = effectiveDeltaX < 0;

          const innerCanStillScroll =
            (scrollingRight && !atRight) || (scrollingLeft && !atLeft);

          if (innerCanStillScroll) {
            innerScrollCooldownRef.current = true;
            clearTimeout(innerScrollTimeoutRef.current);
            return;
          } else {
            if (innerScrollCooldownRef.current) {
              clearTimeout(innerScrollTimeoutRef.current);
              innerScrollTimeoutRef.current = setTimeout(() => {
                innerScrollCooldownRef.current = false;
              }, SCROLL_CONFIG.innerScrollLeakyDelay);

              e.preventDefault();
              return;
            }
          }
        }

        e.preventDefault();
        if (isTransitioningRef.current || innerScrollCooldownRef.current)
          return;

        if (Math.abs(effectiveDeltaX) > 18) {
          const direction = effectiveDeltaX > 0 ? 1 : -1;
          changeSection(activeIdx + direction);
        }
      } else {
        // --- DESKTOP LOGIC (Original Vertical Section Transitions) ---
        const isHorizontalDominant = Math.abs(e.deltaX) > Math.abs(e.deltaY);

        if (isHorizontalDominant) {
          const scrollXEl = getScrollableAncestorX(e.target, viewport);
          if (scrollXEl) {
            innerScrollCooldownRef.current = true;
            clearTimeout(innerScrollTimeoutRef.current);
            return;
          }
        }

        const scrollYEl = getScrollableAncestorY(e.target, viewport);
        if (scrollYEl) {
          const { scrollTop, scrollHeight, clientHeight } = scrollYEl;
          const atTop = scrollTop <= 0;
          const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
          const scrollingDown = e.deltaY > 0;
          const scrollingUp = e.deltaY < 0;

          const innerCanStillScroll =
            (scrollingDown && !atBottom) || (scrollingUp && !atTop);

          if (innerCanStillScroll) {
            innerScrollCooldownRef.current = true;
            clearTimeout(innerScrollTimeoutRef.current);
            return;
          } else {
            if (innerScrollCooldownRef.current) {
              clearTimeout(innerScrollTimeoutRef.current);
              innerScrollTimeoutRef.current = setTimeout(() => {
                innerScrollCooldownRef.current = false;
              }, SCROLL_CONFIG.innerScrollLeakyDelay);

              e.preventDefault();
              return;
            }
          }
        }

        e.preventDefault();
        if (isTransitioningRef.current || innerScrollCooldownRef.current)
          return;

        if (
          Math.abs(e.deltaY) > 18 &&
          Math.abs(e.deltaY) > Math.abs(e.deltaX)
        ) {
          const direction = e.deltaY > 0 ? 1 : -1;
          changeSection(activeIdx + direction);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      clearTimeout(innerScrollTimeoutRef.current);
      clearTimeout(globalScrollTimeout);
    };
  }, [activeIdx]);

  return (
    <div
      className={styles["glass-wrapper"]}
      data-theme={isDarkMode ? "dark" : "light"}
    >
      <AmbientBackground />

      <main ref={viewportRef} className={styles["window-viewport"]}>
        {SECTIONS.map((section, idx) => (
          <SectionCard
            key={section.id}
            section={{
              ...section,
              content: section.content(isDarkMode),
            }}
            progress={activeIdx}
            index={idx}
          />
        ))}
      </main>

      <RightDock
        progress={activeIdx}
        activeIdx={activeIdx}
        sections={SECTIONS}
        onDotClick={goToSection}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
      />
    </div>
  );
}
