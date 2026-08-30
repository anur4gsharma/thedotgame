import { useGameStore } from "../../store/game-store";
import { generateSquareBoard } from "@dots-game/shared";
import styles from "./lobby.module.css";

export function Lobby() {
  const lobbyState = useGameStore((s) => s.lobbyState);
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const startMultiplayerGame = useGameStore((s) => s.startMultiplayerGame);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!lobbyState || !roomCode) return null;

  const match = lobbyState.boardId.match(/(\d+)x(\d+)/);
  const size = match ? parseInt(match[1], 10) : 5;
  const board = generateSquareBoard(size, size, lobbyState.boardId, `${size}×${size}`);
  
  const shareUrl = `${window.location.origin}?room=${roomCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      alert("Link copied!");
    }
  };

  const isReady = lobbyState.players.length === lobbyState.maxPlayers;

  return (
    <div className={styles.lobby}>
      <div className={styles.content}>
        <div className={styles.header}>
          THE DOT GAME
        </div>

        <div className={styles.matchmaking}>
          <div className={styles.status}>
            {isReady ? "MATCH FOUND" : "LOOKING FOR AN OPPONENT"}
          </div>

          {!isReady && (
            <div className={styles.dotGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.dot} />
              ))}
            </div>
          )}

          <div className={styles.players}>
            {lobbyState.players.length} / {lobbyState.maxPlayers} PLAYERS WAITING
          </div>

          <div className={styles.divider} />

          <div className={styles.details}>
            <div>
              <div className={styles.detailLabel}>GRID</div>
              <div>{board.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={styles.detailLabel}>MATCH</div>
              <div>CLASSIC</div>
            </div>
          </div>
        </div>

        <div className={styles.codeSection}>
          <div className={styles.codeLabel}>INVITE CODE</div>
          <div className={styles.code} onClick={copyLink}>{roomCode}</div>
        </div>

        <div className={styles.actions}>
          {isHost ? (
            <button
              className={styles.startBtn}
              onClick={startMultiplayerGame}
              disabled={!isReady}
            >
              {isReady ? "ENTER MATCH" : "WAITING FOR PLAYERS"}
            </button>
          ) : (
            <button className={styles.startBtn} disabled>
              WAITING FOR HOST
            </button>
          )}
          
          <button className={styles.cancelBtn} onClick={resetGame}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
