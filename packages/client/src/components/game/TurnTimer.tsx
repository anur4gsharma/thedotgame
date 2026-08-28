import { useEffect, useState } from "react";
import styles from "./game.module.css";
import { useGameStore } from "../../store/game-store";

export function TurnTimer() {
  const state = useGameStore((s) => s.state);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!state) return;
    
    // Simplistic timer reset on turn change
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.currentPlayerIndex]);

  if (!state) return null;

  return (
    <div className={styles.turnTimer}>
      Time: {timeLeft}s
    </div>
  );
}
