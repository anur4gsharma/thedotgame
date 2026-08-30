import { useGameStore } from "../../store/game-store";
import type { PlayerColor } from "@dots-game/shared";
import styles from "./game.module.css";
import { TurnTimer } from "./TurnTimer";
import { ChatPanel } from "./ChatPanel";

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
  const mode = useGameStore((s) => s.mode);

  if (!state || !board) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isGameOver = state.status === "completed";

  return (
    <div className={styles.hud}>
      <div className={styles.topBar}>
        <div className={styles.boardInfo}>
          {board.name}
        </div>
        <button className={styles.leaveBtn} onClick={resetGame}>
          Leave Match
        </button>
      </div>

      <div className={styles.scores}>
        {state.players.map((player) => {
          const score = state.scores.get(player.id) || 0;
          const isCurrent = player.id === currentPlayer.id && !isGameOver;

          return (
            <div
              key={player.id}
              className={`${styles.playerScore} ${isCurrent ? styles.active : ""}`}
            >
              <div className={styles.playerLeft}>
                <div
                  className={styles.playerDot}
                  style={{ background: COLOR_VAR[player.color] }}
                />
                <span className={styles.playerName}>{player.name}</span>
              </div>
              <span className={styles.score}>{score}</span>
            </div>
          );
        })}
      </div>

      {!isGameOver && (
        <div className={styles.turnIndicator}>
          <span>{currentPlayer.name}'S TURN</span>
          {mode === "multiplayer" && <TurnTimer />}
        </div>
      )}

      {mode === "multiplayer" && <ChatPanel />}
    </div>
  );
}
