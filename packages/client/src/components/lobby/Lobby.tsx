import { useGameStore, AVAILABLE_BOARDS } from "../../store/game-store";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { getRankTier } from "./elo-display";
import styles from "./lobby.module.css";

const COLOR_VAR: Record<string, string> = {
  blue: "var(--player-blue)",
  red: "var(--player-red)",
  green: "var(--player-green)",
  orange: "var(--player-orange)",
};

export function Lobby() {
  const lobbyState = useGameStore((s) => s.lobbyState);
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const playerId = useGameStore((s) => s.playerId);
  const startMultiplayerGame = useGameStore((s) => s.startMultiplayerGame);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!lobbyState || !roomCode) return null;

  const board = AVAILABLE_BOARDS.find((b) => b.id === lobbyState.boardId);
  const shareUrl = `${window.location.origin}?room=${roomCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  };

  return (
    <div className={styles.lobby}>
      <div className={styles.content}>
        {/* Room header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={resetGame}>
            ← Back
          </button>
          <h2 className={styles.title}>Room</h2>
        </div>

        {/* Room code + share */}
        <div className={styles.roomCodeSection}>
          <div className={styles.roomCode}>{roomCode}</div>
          <button className={styles.shareBtn} onClick={copyLink}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 12l8-8M9 4h3v3M7 12H4V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copy invite link
          </button>
          <div className={styles.shareHint}>
            Share this link or code to invite friends
          </div>
        </div>

        {/* Board info */}
        <div className={styles.boardInfo}>
          <span className={styles.boardLabel}>Board</span>
          <span className={styles.boardName}>{board?.name || lobbyState.boardId}</span>
          <span className={styles.boardCells}>
            {board?.cells.length || 0} cells
          </span>
        </div>

        {/* Players */}
        <div className={styles.playersSection}>
          <div className={styles.playersHeader}>
            <span>Players</span>
            <span className={styles.playerCount}>
              {lobbyState.players.length}/{lobbyState.maxPlayers}
            </span>
          </div>
          <div className={styles.playerList}>
            {lobbyState.players.map((player) => (
              <div
                key={player.id}
                className={`${styles.playerCard} ${player.id === playerId ? styles.isMe : ""}`}
              >
                <div
                  className={styles.playerDot}
                  style={{ background: COLOR_VAR[player.color] || player.color }}
                />
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>
                    {player.name}
                    {player.id === lobbyState.hostId && (
                      <span className={styles.hostBadge}>HOST</span>
                    )}
                    {player.id === playerId && (
                      <span className={styles.meBadge}>YOU</span>
                    )}
                  </span>
                  <span className={styles.playerRating}>
                    {player.rating} · {getRankTier(player.rating)}
                  </span>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: lobbyState.maxPlayers - lobbyState.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.playerCard} ${styles.empty}`}>
                <LoadingSpinner />
                <span className={styles.waitingText}>Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {isHost ? (
            <button
              className={styles.startBtn}
              onClick={startMultiplayerGame}
              disabled={lobbyState.players.length < 2}
            >
              {lobbyState.players.length < 2
                ? "Waiting for players..."
                : "Start game"}
            </button>
          ) : (
            <div className={styles.waitingMsg}>Waiting for host to start...</div>
          )}
        </div>
      </div>
    </div>
  );
}
