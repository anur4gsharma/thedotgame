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
  const connected = useGameStore((s) => s.connected);
  const roomCode = useGameStore((s) => s.roomCode);
  const lobbyState = useGameStore((s) => s.lobbyState);

  if (!state || !board) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isGameOver = state.status === "completed";

  return (
    <div className={styles.hud}>
      <div className={styles.topBar}>
        <div><div className={styles.boardInfo}>{board.name}</div><div className={styles.settingsLine}>{mode === "multiplayer" ? `${lobbyState?.settings.maxPlayers ?? state.players.length} players · ${lobbyState?.settings.timerMode ? `${lobbyState.settings.timerMode}s timer` : "no timer"}` : "Local match"}</div></div>
        {mode === "multiplayer" && <div className={`${styles.hudConnection} ${connected ? styles.hudOnline : styles.hudOffline}`}><span />{connected ? "Connected" : "Reconnecting…"}</div>}
        {mode === "multiplayer" && roomCode && <div className={styles.roomBadge}>ROOM {roomCode}</div>}
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
                  aria-hidden="true"
                /><span className={styles.srOnly}>{player.color} player</span>
                <span className={styles.playerName}>{player.name}</span>
              </div>
              <span className={styles.score} aria-label={`${score} points`}>{score}</span>
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
