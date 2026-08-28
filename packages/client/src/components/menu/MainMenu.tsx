import { useState, useEffect } from "react";
import { useGameStore, AVAILABLE_BOARDS } from "../../store/game-store";
import type { BoardDefinition } from "@dots-game/shared";
import styles from "./menu.module.css";

// ─── Shape Preview ──────────────────────────────────────

function ShapePreview({ board }: { board: BoardDefinition }) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const v of board.vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  const pad = 0.1;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  const vm = new Map(board.vertices.map((v) => [v.id, v]));

  return (
    <svg className={styles.preview} viewBox={vb} preserveAspectRatio="xMidYMid meet">
      {board.cells.map((cell) => {
        const pts = cell.vertexIds.map((vid) => {
          const v = vm.get(vid);
          return v ? `${v.x},${v.y}` : "0,0";
        }).join(" ");
        return (
          <polygon key={cell.id} points={pts} fill="var(--border-subtle)" stroke="var(--border)" strokeWidth={0.005} />
        );
      })}
      {board.edges.filter((e) => e.claimable).map((edge) => {
        const a = vm.get(edge.vertexA);
        const b = vm.get(edge.vertexB);
        if (!a || !b) return null;
        return (
          <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--edge-default)" strokeWidth={0.008} strokeLinecap="round" />
        );
      })}
      {board.vertices.map((v) => (
        <circle key={v.id} cx={v.x} cy={v.y} r={0.014} fill="var(--vertex-default)" />
      ))}
    </svg>
  );
}

// ─── Main Menu ──────────────────────────────────────────

export function MainMenu() {
  const [playerName, setPlayerName] = useState("Player");
  const [selectedBoard, setSelectedBoard] = useState(AVAILABLE_BOARDS[2].id); // 5x5 default
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

  const handleLocalPlay = () => {
    setStoreName(playerName);
    startLocalGame(selectedBoard, 2);
  };

  const handleCreateRoom = () => {
    setStoreName(playerName);
    createRoom(selectedBoard, 4);
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
          <p className={styles.subtitle}>Shape-based strategy game</p>
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
            {/* Board selection */}
            <div className={styles.field}>
              <label className={styles.label}>Board</label>
              <div className={styles.boards}>
                {AVAILABLE_BOARDS.map((board) => (
                  <button
                    key={board.id}
                    className={`${styles.boardOption} ${selectedBoard === board.id ? styles.selected : ""}`}
                    onClick={() => setSelectedBoard(board.id)}
                  >
                    <ShapePreview board={board} />
                    <span className={styles.boardName}>{board.name}</span>
                    <span className={styles.boardCells}>{board.cells.length} cells</span>
                  </button>
                ))}
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
