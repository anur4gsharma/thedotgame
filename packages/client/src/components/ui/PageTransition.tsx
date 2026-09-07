import { useEffect, useState, type ReactNode } from "react";
import styles from "./page-transition.module.css";

export function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const frame = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(frame); }, [pageKey]);
  return <div className={`${styles.page} ${visible ? styles.visible : ""}`}>{children}</div>;
}
