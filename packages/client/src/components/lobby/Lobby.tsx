import { useGameStore } from "../../store/game-store";
import { generateSquareBoard } from "@dots-game/shared";
import styles from "./lobby.module.css";

export function Lobby() {
  const lobbyState = useGameStore((s) => s.lobbyState);
  const roomCode = useGameStore((s) => s.roomCode);
  const isHost = useGameStore((s) => s.isHost);
  const myPlayerId = useGameStore((s) => s.playerId);
  const startMultiplayerGame = useGameStore((s) => s.startMultiplayerGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const connected = useGameStore((s) => s.connected);

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
  const opponent = lobbyState.players.find(p => p.id !== myPlayerId);
  const hostPlayer = lobbyState.players.find(p => p.id === lobbyState.hostId);

  return (
    <div className={styles.lobby}>
      <div className={styles.content}>
        <div className={styles.header}>
          THE DOT GAME <span style={{fontSize: '0.5em', opacity: 0.7, verticalAlign: 'middle', marginLeft: '0.5rem'}}>[{isHost ? 'HOST' : 'GUEST'}]</span>
        </div>

        <div className={styles.matchmaking}>
          <div className={styles.status}>
            {!connected ? "RECONNECTING..." : isReady ? "MATCH READY" : "LOOKING FOR OPPONENT"}
          </div>

          {!isReady && connected && (
            <div className={styles.dotGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.dot} />
              ))}
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
            <div style={{ padding: '1rem', border: '2px solid var(--ink)', width: '100%', textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {isHost ? lobbyState.players.find(p => p.id === myPlayerId)?.name : hostPlayer?.name || "HOST"}
            </div>
            
            <div style={{ fontWeight: 'bold' }}>VS</div>

            <div style={{ padding: '1rem', border: '2px dashed var(--ink)', width: '100%', textAlign: 'center', color: opponent ? 'inherit' : 'var(--muted)', textTransform: 'uppercase' }}>
              {isHost ? (opponent ? opponent.name : "WAITING...") : (lobbyState.players.find(p => p.id === myPlayerId)?.name)}
            </div>
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
              disabled={!isReady || !connected}
            >
              {isReady ? "ENTER MATCH" : "WAITING FOR OPPONENT"}
            </button>
          ) : (
            <button className={styles.startBtn} disabled style={{ opacity: 0.8 }}>
              {isReady ? "WAITING FOR HOST TO START" : "WAITING FOR HOST"}
            </button>
          )}
          
          <button className={styles.cancelBtn} onClick={resetGame}>
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}
