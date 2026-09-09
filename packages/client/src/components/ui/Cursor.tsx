import { useEffect, useRef, useState } from "react";
import styles from "./cursor.module.css";

type CursorState = "default" | "hover" | "click" | "grab" | "grabbing" | "board" | "invalid";

export function setCursorState(state: CursorState): void {
  window.dispatchEvent(new CustomEvent<CursorState>("dotgame:cursor", { detail: state }));
}

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null); const ringRef = useRef<HTMLDivElement>(null); const animationRef = useRef<HTMLVideoElement>(null); const pointer = useRef({ x: -100, y: -100, targetX: -100, targetY: -100 }); const [state, setState] = useState<CursorState>("default"); const [showClickAnimation, setShowClickAnimation] = useState(false);
  useEffect(() => {
    const root = document.documentElement; root.classList.add("has-custom-cursor");
    const onMove = (event: PointerEvent) => { pointer.current.targetX = event.clientX; pointer.current.targetY = event.clientY; const element = event.target instanceof Element ? event.target : null; if (element?.closest("button,a,input,select,textarea,[role=button]")) setState((current) => current === "click" ? current : "hover"); else if (!element?.closest("[data-cursor-lock]")) setState((current) => current === "hover" ? "default" : current); };
    const onDown = () => { setState("click"); setShowClickAnimation(true); const animation = animationRef.current; if (animation) { animation.currentTime = 0; void animation.play().catch(() => undefined); } }; const onUp = () => setState("default"); const onCustom = (event: Event) => setState((event as CustomEvent<CursorState>).detail);
    let frame = 0; const animate = () => { const p = pointer.current; p.x += (p.targetX - p.x) * 0.22; p.y += (p.targetY - p.y) * 0.22; const transform = `translate3d(${p.x}px,${p.y}px,0)`; if (dotRef.current) dotRef.current.style.transform = transform; if (ringRef.current) ringRef.current.style.transform = transform; if (animationRef.current) animationRef.current.style.transform = transform; frame = requestAnimationFrame(animate); };
    window.addEventListener("pointermove", onMove, { passive: true }); window.addEventListener("pointerdown", onDown, { passive: true }); window.addEventListener("pointerup", onUp, { passive: true }); window.addEventListener("dotgame:cursor", onCustom); frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); root.classList.remove("has-custom-cursor"); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointerup", onUp); window.removeEventListener("dotgame:cursor", onCustom); };
  }, []);
  return <><video ref={animationRef} className={`${styles.clickAnimation} ${showClickAnimation ? styles.clickAnimationVisible : ""}`} src="/assets/mouse-cursor-animation-13849424.mp4" muted playsInline onEnded={() => setShowClickAnimation(false)} aria-hidden="true" /><div ref={ringRef} className={`${styles.ring} ${styles[state]}`} aria-hidden="true" /><div ref={dotRef} className={`${styles.dot} ${styles[state]}`} aria-hidden="true" /></>;
}
