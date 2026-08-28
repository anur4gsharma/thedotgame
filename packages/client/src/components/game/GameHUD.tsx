import { useGameStore } from "../../store/game-store";
import type { PlayerColor } from "@dots-game/shared";
import styles from "./game.module.css";

const COLOR_VAR: Record<PlayerColor, string> = {
  blue: "var(--player-blue)",
  red: "var(--player-red)",
  green: "var(--player-green)",
  orange: "var(--player-orange)",
};


export function GameHUD() {
  const state = useGameStore((s) => s.state);
  const board = useGameStore((s) => s.board);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!state || !board) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const totalCells = board.cells.length;
  const claimedCells = Array.from(state.cells.values()).filter(
    (cell) => cell.owner !== null,
  ).length;

  return (
    <div className={styles.hud}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.boardInfo}>
          <span className={styles.boardName}>{board.name}</span>
          <span className={styles.separator}>·</span>
          <span className={styles.cellCount}>
            {claimedCells}/{totalCells}
          </span>
        </div>
        <button className={styles.leaveBtn} onClick={resetGame}>
          Leave
        </button>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        {/* Scores */}
        <div className={styles.scores}>
          {state.players.map((player) => {
            const score = state.scores.get(player.id) || 0;
            const isCurrent = player.id === currentPlayer.id;

            return (
              <div
                key={player.id}
                className={`${styles.playerScore} ${isCurrent ? styles.active : ""}`}
              >
                <div
                  className={styles.playerDot}
                  style={{ background: COLOR_VAR[player.color] }}
                />
                <span className={styles.playerName}>{player.name}</span>
                <span className={styles.score}>{score}</span>
              </div>
            );
          })}
        </div>

        {/* Turn indicator */}
        <div className={styles.turnIndicator}>
          <div
            className={styles.turnDot}
            style={{ background: COLOR_VAR[currentPlayer.color] }}
          />
          <span className={styles.turnText}>
            {currentPlayer.name}'s turn
          </span>
        </div>
      </div>
    </div>
  );
}
