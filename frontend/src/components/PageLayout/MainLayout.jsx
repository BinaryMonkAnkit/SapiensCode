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
  smoothing: 0.12, // Restores smooth window translation glide physics
  restThreshold: 0.005,
  sectionChangeCooldown: 700, // Disables rapid trackpad swiping completely
  innerScrollLeakyDelay: 350, // MS to wait AFTER hitting an inner container boundary before allowing a section change
};

const SECTIONS = [
  {
    id: "chat",
    icon: MessageSquare,
    content: (isDarkMode) => <ChatUI isDarkMode={isDarkMode} />,
  },
  {
    id: "editor",
    icon: Code,
    content: () => <CodeWorkspace />,
  },
  {
    id: "docs",
    icon: FileText,
    content: () => <Documentation />,
    hideChrome: true,
  },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function MainLayout() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [progress, setProgress] = useState(0);

  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef(null);

  const isTransitioningRef = useRef(false);
  const innerScrollCooldownRef = useRef(false);
  const innerScrollTimeoutRef = useRef(null);
  const viewportRef = useRef(null);

  const maxIndex = SECTIONS.length - 1;
  const clampIndex = (value) => clamp(value, 0, maxIndex);

  // --- 1. PHYSICS ENGINE FOR WINDOW ANIMATIONS ---
  const runPhysics = () => {
    const diff = targetRef.current - currentRef.current;

    if (Math.abs(diff) > SCROLL_CONFIG.restThreshold) {
      currentRef.current += diff * SCROLL_CONFIG.smoothing;
      rafRef.current = requestAnimationFrame(runPhysics);
    } else {
      currentRef.current = targetRef.current;
      rafRef.current = null;
    }

    setProgress(currentRef.current);
    setActiveIdx(Math.round(currentRef.current));
  };

  const startPhysics = () => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(runPhysics);
    }
  };

  const changeSection = (nextIndex) => {
    const target = clampIndex(nextIndex);
    if (target === targetRef.current) return;

    targetRef.current = target;
    startPhysics();

    isTransitioningRef.current = true;
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, SCROLL_CONFIG.sectionChangeCooldown);
  };

  const goToSection = (index) => {
    changeSection(index);
  };

  const getScrollableAncestor = (el, boundary) => {
    let node = el;
    while (node && node !== boundary && node !== document.body) {
      if (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        const canScrollY = /(auto|scroll)/.test(style.overflowY);
        if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
          return node;
        }
      }
      node = node.parentElement;
    }
    return null;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    let globalScrollTimeout = null;

    const handleWheel = (e) => {
      // Safety check: Always clear any stuck states if the user stops scrolling for a moment
      clearTimeout(globalScrollTimeout);
      globalScrollTimeout = setTimeout(() => {
        innerScrollCooldownRef.current = false;
        isTransitioningRef.current = false;
      }, 200);

      // Get the scrollable content element under the mouse cursor
      const scrollEl = getScrollableAncestor(e.target, viewport);

      if (scrollEl) {
        const { scrollTop, scrollHeight, clientHeight } = scrollEl;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        const scrollingDown = e.deltaY > 0;
        const scrollingUp = e.deltaY < 0;

        const innerCanStillScroll =
          (scrollingDown && !atBottom) || (scrollingUp && !atTop);

        if (innerCanStillScroll) {
          // Let the inner element scroll naturally
          innerScrollCooldownRef.current = true;
          clearTimeout(innerScrollTimeoutRef.current);
          return;
        } else {
          // Just hit the inner boundaries. Block section changes
          // to absorb high-velocity trackpad momentum ticks.
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

      // Stop default page bouncing behavior
      e.preventDefault();

      if (isTransitioningRef.current || innerScrollCooldownRef.current) return;

      // Section swipe trigger
      if (Math.abs(e.deltaY) > 18) {
        const direction = e.deltaY > 0 ? 1 : -1;
        changeSection(Math.round(targetRef.current) + direction);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(innerScrollTimeoutRef.current);
      clearTimeout(globalScrollTimeout);
    };
  }, []);

  return (
    <div
      className={styles["glass-wrapper"]}
      data-theme={isDarkMode ? "dark" : "light"}
    >
      <svg className={styles["svg-filter-hidden"]}>
        <filter id="glass-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      <AmbientBackground />

      <main ref={viewportRef} className={styles["window-viewport"]}>
        {SECTIONS.map((section, idx) => (
          <SectionCard
            key={section.id}
            section={{
              ...section,
              content: section.content(isDarkMode),
            }}
            progress={progress}
            index={idx}
          />
        ))}
      </main>

      <RightDock
        progress={progress}
        activeIdx={activeIdx}
        sections={SECTIONS}
        onDotClick={goToSection}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
      />
    </div>
  );
}
