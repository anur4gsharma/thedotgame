import { useEffect, useRef, useState } from "react";
import styles from "./cursor.module.css";

export function Cursor() {
  const pointerRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: -100, y: -100, targetX: -100, targetY: -100 });
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (coarsePointer) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const onMove = (event: PointerEvent) => {
      pointer.current.targetX = event.clientX;
      pointer.current.targetY = event.clientY;
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onWindowBlur = () => setPressed(false);

    let frame = 0;
    const animate = () => {
      const current = pointer.current;
      current.x += (current.targetX - current.x) * 0.22;
      current.y += (current.targetY - current.y) * 0.22;
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

  return <div ref={pointerRef} className={`${styles.pointer} ${pressed ? styles.pressed : ""}`} aria-hidden="true" />;
}
