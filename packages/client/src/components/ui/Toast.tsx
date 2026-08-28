import { useEffect, useState } from "react";
import styles from "./ui.module.css";

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for fade out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible && !onClose) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.toastVisible : styles.toastHidden}`} role="alert">
      {message}
    </div>
  );
}
