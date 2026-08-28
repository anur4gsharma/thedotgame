import { useGameStore } from "../../store/game-store";
import { GameEngine } from "@dots-game/shared";
import type { PlayerColor } from "@dots-game/shared";
import styles from "./gameover.module.css";

const COLOR_VAR: Record<PlayerColor, string> = {
  blue: "var(--player-blue)",
  red: "var(--player-red)",
  green: "var(--player-green)",
  orange: "var(--player-orange)",
};

export function GameOverModal() {
  const state = useGameStore((s) => s.state);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!state || state.status !== "completed") return null;

  const results = GameEngine.getGameResult(state);
  const winner = results[0];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.crown}>👑</div>
        <h2 className={styles.title}>{winner.playerName} wins</h2>
        <div className={styles.subtitle}>
          with {winner.score} {winner.score === 1 ? "cell" : "cells"} captured
        </div>

        <div className={styles.results}>
          {results.map((result) => (
            <div key={result.playerId} className={styles.resultRow}>
              <div className={styles.rank}>#{result.rank}</div>
              <div
                className={styles.dot}
                style={{ background: COLOR_VAR[result.color] }}
              />
              <div className={styles.name}>{result.playerName}</div>
              <div className={styles.score}>{result.score}</div>
            </div>
          ))}
        </div>

        <button className={styles.playAgain} onClick={resetGame}>
          Play again
        </button>
      </div>
    </div>
  );
}
