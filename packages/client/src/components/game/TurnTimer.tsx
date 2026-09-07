import { useEffect, useMemo, useState } from "react";
import styles from "./game.module.css";
import { useGameStore } from "../../store/game-store";

export function TurnTimer() {
  const state = useGameStore((store) => store.state); const mode = useGameStore((store) => store.mode); const offset = useGameStore((store) => store.serverOffset); const localDeadline = useGameStore((store) => store.localTimerDeadline); const expireLocalTurn = useGameStore((store) => store.expireLocalTurn); const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => { setNow(Date.now()); if (mode === "local") expireLocalTurn(); }, 100); return () => window.clearInterval(timer); }, [mode, expireLocalTurn]);
  const deadline = mode === "local" ? localDeadline : state?.turnDeadline; const timerMode = mode === "local" ? state?.timerMode ?? 0 : state?.timerMode ?? 0;
  const remainingMs = deadline ? Math.max(0, deadline - (now + (mode === "local" ? 0 : offset))) : 0; const remaining = Math.ceil(remainingMs / 1000); const progress = timerMode > 0 ? Math.min(100, Math.max(0, remainingMs / (timerMode * 1000) * 100)) : 0; const critical = remaining > 0 && remaining <= 5;
  const label = useMemo(() => timerMode === 0 ? "No timer" : `${remaining}s`, [remaining, timerMode]);
  if (!deadline || timerMode === 0 || !state) return null;
  return <div className={`${styles.turnTimer} ${critical ? styles.timerCritical : ""}`} aria-live="polite" aria-label={`${label} remaining`}><span>{label}</span><span className={styles.timerTrack}><span className={styles.timerBar} style={{ width: `${progress}%` }} /></span></div>;
}
