import React, { useState, useEffect } from "react";
import styles from "../../ChatUI.module.css"; // or import your shared/component styles

const HEADINGS = [
  "How can I help you today?",
  "What are we building today?",
  "What's on your mind?",
  "Need help with some code?",
  "Let's solve something together.",
  "Ready when you are!",
  "Where should we start?",
  "Ask me anything.",
];

export default function DynamicHeroHeading() {
  const [displayedHeading, setDisplayedHeading] = useState("");
  const [headingIndex, setHeadingIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set random initial index on mount
  useEffect(() => {
    setHeadingIndex(Math.floor(Math.random() * HEADINGS.length));
  }, []);

  // Typewriter effect loop
  useEffect(() => {
    const currentFullText = HEADINGS[headingIndex] || "";
    let timer;

    if (!isDeleting) {
      if (displayedHeading.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayedHeading(
            currentFullText.slice(0, displayedHeading.length + 1),
          );
        }, 60); // Speed of typing per character
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2500); // Time heading stays visible
      }
    } else {
      if (displayedHeading.length > 0) {
        timer = setTimeout(() => {
          setDisplayedHeading(
            currentFullText.slice(0, displayedHeading.length - 1),
          );
        }, 30); // Speed of erasing per character
      } else {
        setIsDeleting(false);
        setHeadingIndex((prevIndex) => {
          let nextIndex;
          do {
            nextIndex = Math.floor(Math.random() * HEADINGS.length);
          } while (nextIndex === prevIndex && HEADINGS.length > 1);
          return nextIndex;
        });
      }
    }

    return () => clearTimeout(timer);
  }, [displayedHeading, isDeleting, headingIndex]);

  return (
    <h1 className={styles["hero-title"]}>
      {displayedHeading}
      <span className={styles["typing-cursor"]}>|</span>
    </h1>
  );
}
