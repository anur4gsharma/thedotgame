import { useState } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./menu.module.css";
import { HorseAnimation } from "../ui/HorseAnimation";

export function StartMenu() {
  const [name, setName] = useState("");
  const setPlayerName = useGameStore((s) => s.setPlayerName);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPlayerName(name.trim());
    useGameStore.setState({ phase: "menu" });
  };

  return (
    <div className={styles.menu}>
      <HorseAnimation />
      <div className={styles.content}>
        <div className={styles.logo}>
          <h1 className={styles.title}>THE DOT GAME</h1>
        </div>

        <form onSubmit={handleContinue} className={styles.nav}>
          <div className={styles.field}>
            <label className={styles.label}>Enter your player name</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="Call Sign"
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            className={styles.startBtn}
            disabled={!name.trim()}
          >
            Continue
          </button>
        </form>
        
        <div className={styles.terms}>
          <p><strong>Terms & Conditions</strong></p>
          <p>By playing, you agree to respectful gameplay.</p>
          <p><strong>Chat Guidelines:</strong></p>
          <ul>
            <li>No hate speech or harassment.</li>
            <li>No spamming or self-promotion.</li>
            <li>Keep it friendly and constructive.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
