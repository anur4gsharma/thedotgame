import styles from "./horse.module.css";

export function HorseAnimation() {
  return (
    <div className={styles.container}>
      <svg viewBox="0 0 100 100" className={styles.horse}>
        {/* Body */}
        <circle cx="30" cy="40" r="1.5" className={styles.dot} />
        <circle cx="40" cy="40" r="1.5" className={styles.dot} />
        <circle cx="50" cy="40" r="1.5" className={styles.dot} />
        <circle cx="60" cy="40" r="1.5" className={styles.dot} />
        
        {/* Neck & Head */}
        <circle cx="65" cy="32" r="1.5" className={styles.dot} />
        <circle cx="70" cy="25" r="1.5" className={styles.dot} />
        <circle cx="75" cy="27" r="1.5" className={styles.dot} />
        
        {/* Tail */}
        <circle cx="22" cy="43" r="1.5" className={`${styles.dot} ${styles.tail}`} />
        
        {/* Legs */}
        <g className={styles.legFront1}>
          <circle cx="60" cy="48" r="1.5" className={styles.dot} />
          <circle cx="60" cy="58" r="1.5" className={styles.dot} />
        </g>
        <g className={styles.legFront2}>
          <circle cx="60" cy="48" r="1.5" className={styles.dot} />
          <circle cx="60" cy="58" r="1.5" className={styles.dot} />
        </g>
        <g className={styles.legBack1}>
          <circle cx="40" cy="48" r="1.5" className={styles.dot} />
          <circle cx="40" cy="58" r="1.5" className={styles.dot} />
        </g>
        <g className={styles.legBack2}>
          <circle cx="40" cy="48" r="1.5" className={styles.dot} />
          <circle cx="40" cy="58" r="1.5" className={styles.dot} />
        </g>
      </svg>
    </div>
  );
}
