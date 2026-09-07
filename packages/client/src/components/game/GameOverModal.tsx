import { useGameStore } from "../../store/game-store";
import { GameEngine } from "@dots-game/shared";
import type { GameResult } from "@dots-game/shared";
import styles from "./gameover.module.css";

export function GameOverModal() {
  const state = useGameStore((s) => s.state);
  const gameResults = useGameStore((s) => s.gameResults);
  const resetGame = useGameStore((s) => s.resetGame);
  const rematch = useGameStore((s) => s.rematch);
  const board = useGameStore((s) => s.board);
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
  const tied = results.length > 1 && results[0].score === results[1].score;
  const duration = state ? Math.max(0, (state.completedAt ?? Date.now()) - state.startedAt) : 0;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Match Over</h2>
      <div className={styles.winner}>{tied ? "It's a tie" : `${winner.playerName} wins`}</div>
      <div className={styles.stats}><span>{board?.name ?? "Custom board"}</span><span>{state?.moveHistory.length ?? 0} moves</span><span>{Math.round(duration / 1000)}s</span></div>

      <div className={styles.results}>
        {results.map((result) => (
          <div key={result.playerId} className={styles.resultRow}>
            <span><strong>#{result.rank}</strong> {result.playerName}</span>
            <span>{result.score} pts</span>
          </div>
        ))}
      </div>

      <button className={styles.playAgainBtn} onClick={mode === "multiplayer" ? rematch : resetGame}>{mode === "multiplayer" ? "Request rematch" : "Play Again"}</button>
      {mode === "multiplayer" && <button className={styles.playAgainBtn} onClick={resetGame}>Leave match</button>}
    </div>
  );
}
