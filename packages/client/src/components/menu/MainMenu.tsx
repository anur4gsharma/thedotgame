import { useState } from "react";
import { useGameStore, AVAILABLE_BOARDS } from "../../store/game-store";
import type { BoardDefinition } from "@dots-game/shared";
import styles from "./menu.module.css";

// ─── Shape Preview (SVG thumbnails) ─────────────────────

function ShapePreview({ board }: { board: BoardDefinition }) {
  // Compute viewBox
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const v of board.vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  const padding = 0.1;
  const vb = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

  const vertexMap = new Map(board.vertices.map((v) => [v.id, v]));

  return (
    <svg className={styles.preview} viewBox={vb} preserveAspectRatio="xMidYMid meet">
      {/* Cells */}
      {board.cells.map((cell) => {
        const points = cell.vertexIds
          .map((vid) => {
            const v = vertexMap.get(vid);
            return v ? `${v.x},${v.y}` : "0,0";
          })
          .join(" ");
        return (
          <polygon
            key={cell.id}
            points={points}
            fill="var(--border-subtle)"
            stroke="var(--border)"
            strokeWidth={0.005}
          />
        );
      })}

      {/* Edges */}
      {board.edges.filter((e) => e.claimable).map((edge) => {
        const vA = vertexMap.get(edge.vertexA);
        const vB = vertexMap.get(edge.vertexB);
        if (!vA || !vB) return null;
        return (
          <line
            key={edge.id}
            x1={vA.x} y1={vA.y}
            x2={vB.x} y2={vB.y}
            stroke="var(--edge-default)"
            strokeWidth={0.008}
            strokeLinecap="round"
          />
        );
      })}

      {/* Vertices */}
      {board.vertices.map((v) => (
        <circle
          key={v.id}
          cx={v.x} cy={v.y}
          r={0.014}
          fill="var(--vertex-default)"
        />
      ))}
    </svg>
  );
}

// ─── Main Menu ──────────────────────────────────────────

export function MainMenu() {
  const [selectedBoard, setSelectedBoard] = useState<string>(AVAILABLE_BOARDS[0].id);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [playerName, setPlayerName] = useState("Player 1");

  const startGame = useGameStore((s) => s.startGame);
  const setStoreName = useGameStore((s) => s.setPlayerName);

  const handleStart = () => {
    setStoreName(playerName);
    startGame(selectedBoard, playerCount);
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

        {/* Player name */}
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
              </button>
            ))}
          </div>
        </div>

        {/* Player count */}
        <div className={styles.field}>
          <label className={styles.label}>Players</label>
          <div className={styles.playerCounts}>
            {([2, 3, 4] as const).map((count) => (
              <button
                key={count}
                className={`${styles.countBtn} ${playerCount === count ? styles.selected : ""}`}
                onClick={() => setPlayerCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button className={styles.startBtn} onClick={handleStart}>
          Start game
        </button>
      </div>
    </div>
  );
}
