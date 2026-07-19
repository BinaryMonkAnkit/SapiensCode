import styles from "../MainLayout.module.css";

export default function AmbientBackground() {
  return (
    <>
      <div className={`${styles["ambient-glow"]} ${styles["glow-1"]}`} />
      <div className={`${styles["ambient-glow"]} ${styles["glow-2"]}`} />
    </>
  );
}
