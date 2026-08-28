import { useGameStore } from "../../store/game-store";
import { GameEngine } from "@dots-game/shared";
import type { PlayerColor, GameResult } from "@dots-game/shared";
import styles from "./gameover.module.css";

const COLOR_VAR: Record<PlayerColor, string> = {
  blue: "var(--player-blue)",
  red: "var(--player-red)",
  green: "var(--player-green)",
  orange: "var(--player-orange)",
};

export function GameOverModal() {
  const state = useGameStore((s) => s.state);
  const gameResults = useGameStore((s) => s.gameResults);
  const resetGame = useGameStore((s) => s.resetGame);
  const mode = useGameStore((s) => s.mode);

  // Use multiplayer results if available, otherwise compute from local state
  let results: GameResult[];
  if (gameResults) {
    results = gameResults;
  } else if (state && state.status === "completed") {
    results = GameEngine.getGameResult(state);
  } else {
    return null;
  }

  if (results.length === 0) return null;

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
                style={{ background: COLOR_VAR[result.color] || "var(--text)" }}
              />
              <div className={styles.name}>{result.playerName}</div>
              <div className={styles.score}>{result.score}</div>
            </div>
          ))}
        </div>

        <button className={styles.playAgain} onClick={resetGame}>
          {mode === "multiplayer" ? "Back to menu" : "Play again"}
        </button>
      </div>
    </div>
  );
}
