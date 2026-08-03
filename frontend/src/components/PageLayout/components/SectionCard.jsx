import { useEffect, useState } from "react";
import styles from "./SectionCard.module.css";

export default function SectionCard({ section, progress, index }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const offset = index - progress;
  const absOffset = Math.abs(offset);

  const translateOffset = offset * 100;
  const scale = Math.max(1 - absOffset * 0.08, 0.88);
  const blurAmount = absOffset * 20;
  const opacity = Math.max(1 - absOffset * 1.1, 0);
  const zIndex = 30 - Math.round(absOffset * 10);

  // Animate on X-axis for mobile/small screens, Y-axis for desktop
  const translateX = isMobile ? translateOffset : 0;
  const translateY = isMobile ? 0 : translateOffset;

  return (
    <section
      key={section.id}
      className={styles["glass-card"]}
      style={{
        transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${scale})`,
        opacity,
        zIndex,
        backdropFilter: `blur(${32 + blurAmount}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${32 + blurAmount}px) saturate(180%)`,
        pointerEvents: absOffset < 0.3 ? "auto" : "none",
      }}
    >
      <div className={styles["specular-edge"]} />
      <div className={styles["grain-layer"]} />

      {!section.hideChrome && (
        <div className={styles["window-chrome"]}>
          <div className={styles["chrome-title"]}>{section.label}</div>
        </div>
      )}

      <div className={styles["card-content"]}>
        <h1 className={styles["content-title"]}>{section.title}</h1>
        {section.content ? (
          section.content
        ) : (
          <p className={styles["content-subtitle"]}>{section.subtitle}</p>
        )}
      </div>
    </section>
  );
}
