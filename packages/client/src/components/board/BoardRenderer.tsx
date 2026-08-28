import { useCallback, useMemo, useState } from "react";
import { useGameStore } from "../../store/game-store";
import type { BoardDefinition, PlayerColor } from "@dots-game/shared";
import styles from "./board.module.css";

// ─── Player Color Map ───────────────────────────────────

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: "var(--player-blue)",
  red: "var(--player-red)",
  green: "var(--player-green)",
  orange: "var(--player-orange)",
};

const PLAYER_COLORS_DIM: Record<PlayerColor, string> = {
  blue: "var(--player-blue-dim)",
  red: "var(--player-red-dim)",
  green: "var(--player-green-dim)",
  orange: "var(--player-orange-dim)",
};

// ─── Board Renderer ─────────────────────────────────────

interface BoardRendererProps {
  board: BoardDefinition;
}

export function BoardRenderer({ board }: BoardRendererProps) {
  const state = useGameStore((s) => s.state);
  const pendingEdge = useGameStore((s) => s.pendingEdge);
  const makeMove = useGameStore((s) => s.makeMove);

  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  // Compute bounding box and viewBox
  const viewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const v of board.vertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const padding = 0.08;
    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [board]);

  // Vertex position lookup
  const vertexPos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const v of board.vertices) {
      map.set(v.id, { x: v.x, y: v.y });
    }
    return map;
  }, [board]);

  // Edge click handler
  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      if (!state) return;
      const edgeState = state.edges.get(edgeId);
      if (edgeState?.owner) return;
      makeMove(edgeId);
    },
    [state, makeMove],
  );

  // Current player color for pending/hover states
  const currentPlayer = state?.players[state.currentPlayerIndex];
  const currentColor = currentPlayer ? PLAYER_COLORS[currentPlayer.color] : "var(--accent)";

  if (!state) return null;

  return (
    <svg
      className={styles.board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Completed cells (fill) */}
      {board.cells.map((cell) => {
        const cellState = state.cells.get(cell.id);
        if (!cellState?.owner) return null;

        const player = state.players.find((p) => p.id === cellState.owner);
        if (!player) return null;

        const points = cell.vertexIds
          .map((vid) => {
            const pos = vertexPos.get(vid);
            return pos ? `${pos.x},${pos.y}` : "0,0";
          })
          .join(" ");

        return (
          <polygon
            key={cell.id}
            points={points}
            fill={PLAYER_COLORS_DIM[player.color]}
            className={styles.cellFill}
          />
        );
      })}

      {/* Edges */}
      {board.edges
        .filter((e) => e.claimable)
        .map((edge) => {
          const vA = vertexPos.get(edge.vertexA);
          const vB = vertexPos.get(edge.vertexB);
          if (!vA || !vB) return null;

          const edgeState = state.edges.get(edge.id);
          const isClaimed = edgeState?.owner != null;
          const isPending = pendingEdge === edge.id;
          const isHovered = hoveredEdge === edge.id;

          const owner = isClaimed
            ? state.players.find((p) => p.id === edgeState.owner)
            : null;

          // Visible line
          let strokeColor = "var(--edge-default)";
          let strokeWidth = 0.012;
          let opacity = 1;

          if (isClaimed && owner) {
            strokeColor = PLAYER_COLORS[owner.color];
            strokeWidth = 0.018;
          } else if (isPending) {
            strokeColor = currentColor;
            strokeWidth = 0.018;
            opacity = 0.7;
          } else if (isHovered) {
            strokeColor = "var(--edge-hover)";
            strokeWidth = 0.016;
          }

          return (
            <g key={edge.id}>
              {/* Invisible hit area (wide) */}
              {!isClaimed && (
                <line
                  x1={vA.x}
                  y1={vA.y}
                  x2={vB.x}
                  y2={vB.y}
                  stroke="transparent"
                  strokeWidth={0.06}
                  className={styles.hitArea}
                  onClick={() => handleEdgeClick(edge.id)}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edge from ${edge.vertexA} to ${edge.vertexB}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEdgeClick(edge.id);
                    }
                  }}
                />
              )}

              {/* Visible line */}
              <line
                x1={vA.x}
                y1={vA.y}
                x2={vB.x}
                y2={vB.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
                className={styles.edge}
                pointerEvents="none"
              />
            </g>
          );
        })}

      {/* Vertices (dots) */}
      {board.vertices.map((vertex) => {
        // Check if this vertex is at the intersection of claimed edges
        const isConnectedToClaimed = board.edges.some((e) => {
          if (e.vertexA !== vertex.id && e.vertexB !== vertex.id) return false;
          const edgeState = state.edges.get(e.id);
          return edgeState?.owner != null;
        });

        return (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={isConnectedToClaimed ? 0.016 : 0.012}
            fill={isConnectedToClaimed ? "var(--vertex-active)" : "var(--vertex-default)"}
            className={styles.vertex}
            pointerEvents="none"
          />
        );
      })}
    </svg>
  );
}
