import { useState } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./lobby.module.css";

export function Lobby() {
  const lobby = useGameStore((state) => state.lobbyState);
  const roomCode = useGameStore((state) => state.roomCode);
  const playerId = useGameStore((state) => state.playerId);
  const isHost = useGameStore((state) => state.isHost);
  const connected = useGameStore((state) => state.connected);
  const setReady = useGameStore((state) => state.setReady);
  const start = useGameStore((state) => state.startMultiplayerGame);
  const leave = useGameStore((state) => state.resetGame);
  const [copied, setCopied] = useState(false);

  if (!lobby || !roomCode) return null;
  const me = lobby.players.find((player) => player.id === playerId);
  const opponent = lobby.players.find((player) => player.id !== playerId);
  const allReady = lobby.players.length >= 2 && lobby.players.every((player) => player.ready);
  const shareUrl = `${window.location.origin}/?room=${roomCode}`;
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { useGameStore.setState({ error: "Copy is unavailable. Select the room code manually." }); } };
  const connectionLabel = connected ? "CONNECTED" : "RECONNECTING…";
  const matchLabel = !connected ? "RECONNECTING" : !opponent ? "WAITING FOR OPPONENT" : allReady ? "MATCH READY" : "OPPONENT JOINED";

  return <div className={styles.lobby}><div className={styles.content}>
    <div className={styles.headerRow}><div className={styles.header}>THE DOT GAME</div><span className={`${styles.connection} ${connected ? styles.online : styles.offline}`}><span className={styles.connectionDot} />{connectionLabel}</span></div>
    <div className={styles.matchmaking}><div className={styles.status}>{matchLabel}</div><div className={styles.vsGrid}>
      <PlayerCard name={me?.name ?? "You"} label={isHost ? "HOST · YOU" : "YOU"} ready={Boolean(me?.ready)} connected={Boolean(me?.connected)} active />
      <div className={styles.vs}>VS<span className={styles.vsLine} /></div>
      <PlayerCard name={opponent?.name ?? "Waiting for player"} label={opponent ? "OPPONENT" : "OPEN SEAT"} ready={Boolean(opponent?.ready)} connected={Boolean(opponent?.connected)} />
    </div></div>
    <div className={styles.infoCard}><div className={styles.infoTitle}>ROOM CODE</div><div className={styles.roomCodeRow}><button className={styles.code} onClick={() => copy(roomCode)} aria-label="Copy room code">{roomCode}</button><button className={styles.copyButton} onClick={() => copy(roomCode)}>{copied ? "Copied" : "Copy"}</button><button className={styles.copyButton} onClick={() => copy(shareUrl)}>Share</button></div><div className={styles.shareHint}>{shareUrl}</div></div>
    <div className={styles.detailsGrid}><Detail label="PLAYERS" value={`${lobby.players.length} / ${lobby.settings.maxPlayers}`} /><Detail label="READY STATE" value={allReady ? "All ready" : `${lobby.players.filter((player) => player.ready).length} ready`} /><Detail label="BOARD" value={`${lobby.settings.board.width} × ${lobby.settings.board.height}`} /><Detail label="TIMER" value={lobby.settings.timerMode ? `${lobby.settings.timerMode === 120 ? "2 min" : `${lobby.settings.timerMode}s`} / turn` : "No timer"} /><Detail label="GAME MODE" value="Online · Private" /><Detail label="HOST" value={lobby.players.find((player) => player.id === lobby.hostId)?.name ?? "—"} /></div>
    <div className={styles.actions}>{me && <button className={styles.readyBtn} onClick={() => setReady(!me.ready)} disabled={!connected}>{me.ready ? "Ready ✓" : "Ready up"}</button>}{isHost && <button className={styles.startBtn} onClick={start} disabled={!allReady || !connected}>{allReady ? "Start game" : "Waiting for players"}</button>}{!isHost && <div className={styles.waitingText}>{allReady ? "Waiting for host to start" : "Ready up when you are set"}</div>}<button className={styles.cancelBtn} onClick={leave}>Leave room</button></div>
  </div></div>;
}

function PlayerCard({ name, label, ready, connected, active = false }: { name: string; label: string; ready: boolean; connected: boolean; active?: boolean }) {
  return <div className={`${styles.playerCard} ${active ? styles.playerActive : ""}`}><div className={styles.playerLabel}>{label}</div><div className={styles.playerName}>{name}</div><div className={`${styles.playerStatus} ${connected ? styles.statusOnline : styles.statusOffline}`}><span className={styles.connectionDot} />{!connected ? "Disconnected" : ready ? "Ready" : "Waiting"}</div></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className={styles.detail}><div className={styles.detailLabel}>{label}</div><div className={styles.detailValue}>{value}</div></div>; }
