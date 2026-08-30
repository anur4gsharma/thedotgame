import { useState, useEffect } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./menu.module.css";

// ─── Constants ──────────────────────────────────────────

const MIN_SIZE = 3;
const MAX_SIZE = 10;

// ─── Main Menu ──────────────────────────────────────────

export function MainMenu() {
  const [playerName, setPlayerName] = useState("Player");
  const [boardSize, setBoardSize] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"home" | "join">("home");

  const startLocalGame = useGameStore((s) => s.startLocalGame);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const setStoreName = useGameStore((s) => s.setPlayerName);
  const error = useGameStore((s) => s.error);

  // Check URL for room code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setJoinCode(room.toUpperCase());
      setView("join");
    }
  }, []);

  const boardId = `square-${boardSize}x${boardSize}`;

  const handleLocalPlay = () => {
    setStoreName(playerName);
    startLocalGame(boardId, boardSize, 2);
  };

  const handleCreateRoom = () => {
    setStoreName(playerName);
    createRoom(boardId, boardSize, 4);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    setStoreName(playerName);
    joinRoom(joinCode.trim());
  };

  return (
    <div className={styles.menu}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoDots}>
            <span className={styles.dot1} />
            <span className={styles.dot2} />
            <span className={styles.dot3} />
          </div>
          <h1 className={styles.title}>Dots</h1>
          <p className={styles.subtitle}>Connect the dots, claim the boxes</p>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>Your name</label>
          <input
            className={styles.input}
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            maxLength={20}
            placeholder="Enter name..."
          />
        </div>

        {view === "home" ? (
          <>
            {/* Board size slider */}
            <div className={styles.field}>
              <label className={styles.label}>
                Board size — {boardSize}×{boardSize}
              </label>
              <input
                className={styles.slider}
                type="range"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={boardSize}
                onChange={(e) => setBoardSize(Number(e.target.value))}
              />
              <div className={styles.sliderLabels}>
                <span>{MIN_SIZE}×{MIN_SIZE}</span>
                <span>{MAX_SIZE}×{MAX_SIZE}</span>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={handleLocalPlay}>
                Play locally
              </button>
              <button className={styles.secondaryBtn} onClick={handleCreateRoom}>
                Create room
              </button>
              <button className={styles.textBtn} onClick={() => setView("join")}>
                Join a room
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Join room */}
            <div className={styles.field}>
              <label className={styles.label}>Room code</label>
              <input
                className={styles.input}
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                placeholder="Enter 6-letter code..."
                autoFocus
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button
                className={styles.primaryBtn}
                onClick={handleJoin}
                disabled={joinCode.length < 4}
              >
                Join game
              </button>
              <button className={styles.textBtn} onClick={() => setView("home")}>
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
