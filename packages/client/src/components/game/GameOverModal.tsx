import { useGameStore } from "../../store/game-store";
import { GameEngine } from "@dots-game/shared";
import type { GameResult } from "@dots-game/shared";
import styles from "./gameover.module.css";

export function GameOverModal() {
  const state = useGameStore((s) => s.state);
  const gameResults = useGameStore((s) => s.gameResults);
  const resetGame = useGameStore((s) => s.resetGame);
  const mode = useGameStore((s) => s.mode);

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
    <div className={styles.container}>
      <h2 className={styles.title}>Match Over</h2>
      <div className={styles.winner}>
        {winner.playerName} wins
      </div>

      <div className={styles.results}>
        {results.map((result) => (
          <div key={result.playerId} className={styles.resultRow}>
            <span>{result.playerName}</span>
            <span>{result.score}</span>
          </div>
        ))}
      </div>

      <button className={styles.playAgainBtn} onClick={resetGame}>
        {mode === "multiplayer" ? "Exit Match" : "Play Again"}
      </button>
    </div>
  );
}
