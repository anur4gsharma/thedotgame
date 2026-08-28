import styles from "./ui.module.css";

export function LoadingSpinner() {
  return (
    <div className={styles.spinner} role="status" aria-label="Loading">
      <div className={styles.spinnerCircle} />
    </div>
  );
}
