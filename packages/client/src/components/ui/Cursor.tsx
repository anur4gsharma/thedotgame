import { useEffect, useRef, useState } from "react";
import styles from "./cursor.module.css";

export function Cursor() {
  const pointerRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: -100, y: -100, targetX: -100, targetY: -100 });
  const [pressed, setPressed] = useState(false);
  const [type, setType] = useState("default");

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (coarsePointer) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const onMove = (event: PointerEvent) => {
      pointer.current.targetX = event.clientX;
      pointer.current.targetY = event.clientY;
      
      let currentType = "default";
      let el = event.target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.dataset.cursor) {
          currentType = el.dataset.cursor;
          break;
        }
        el = el.parentElement;
      }
      setType(currentType);
    };
    
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onWindowBlur = () => setPressed(false);

    let frame = 0;
    const animate = () => {
      const current = pointer.current;
      current.x = current.targetX;
      current.y = current.targetY;
      if (pointerRef.current) {
        pointerRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      }
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  let content = null;
  if (type === "grab" || type === "board") {
    content = (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" className={styles.handIcon}>
        <rect x="7" y="10" width="10" height="10" />
        <line x1="7" y1="10" x2="7" y2={pressed ? "7" : "4"} />
        <line x1="10" y1="10" x2="10" y2={pressed ? "7" : "2"} />
        <line x1="13" y1="10" x2="13" y2={pressed ? "7" : "3"} />
        <line x1="17" y1="13" x2="17" y2={pressed ? "10" : "7"} />
      </svg>
    );
  }

  return (
    <div 
      ref={pointerRef} 
      className={`${styles.pointer} ${pressed ? styles.pressed : ""} ${type !== "default" ? styles.customShape : ""}`} 
      aria-hidden="true"
    >
      {content}
    </div>
  );
}
