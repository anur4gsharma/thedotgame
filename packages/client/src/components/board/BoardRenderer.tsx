import { useCallback, useMemo, useState, useRef } from "react";
import { useGameStore } from "../../store/game-store";
import type { BoardDefinition, PlayerColor } from "@dots-game/shared";
import styles from "./board.module.css";

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

interface BoardRendererProps {
  board: BoardDefinition;
}

export function BoardRenderer({ board }: BoardRendererProps) {
  const state = useGameStore((s) => s.state);
  const pendingEdge = useGameStore((s) => s.pendingEdge);
  const makeLocalMove = useGameStore((s) => s.makeLocalMove);
  const makeMultiplayerMove = useGameStore((s) => s.makeMultiplayerMove);
  const mode = useGameStore((s) => s.mode);

  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [dragVertex, setDragVertex] = useState<string | null>(null);
  const [dragOverVertex, setDragOverVertex] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute viewBox
  const viewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const v of board.vertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const pad = 0.08;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [board]);

  // Vertex position lookup
  const vertexPos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const v of board.vertices) map.set(v.id, v);
    return map;
  }, [board]);

  // Build vertex→edges index for drag detection
  const vertexEdges = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of board.edges) {
      if (!edge.claimable) continue;
      const a = map.get(edge.vertexA) || [];
      const b = map.get(edge.vertexB) || [];
      a.push(edge.id);
      b.push(edge.id);
      map.set(edge.vertexA, a);
      map.set(edge.vertexB, b);
    }
    return map;
  }, [board]);

  // Edge vertex pairs
  const edgeVertices = useMemo(() => {
    const map = new Map<string, { a: string; b: string }>();
    for (const edge of board.edges) {
      map.set(edge.id, { a: edge.vertexA, b: edge.vertexB });
    }
    return map;
  }, [board]);

  const commitMove = useCallback(
    (edgeId: string) => {
      if (mode === "local") makeLocalMove(edgeId);
      else makeMultiplayerMove(edgeId);
    },
    [mode, makeLocalMove, makeMultiplayerMove],
  );

  // Check if an edge connects two vertices
  const findEdge = useCallback(
    (v1: string, v2: string): string | null => {
      const edges1 = vertexEdges.get(v1) || [];
      for (const eid of edges1) {
        const pair = edgeVertices.get(eid);
        if (pair && ((pair.a === v1 && pair.b === v2) || (pair.a === v2 && pair.b === v1))) {
          return eid;
        }
      }
      return null;
    },
    [vertexEdges, edgeVertices],
  );

  // Click on edge (fallback for click users)
  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      if (!state) return;
      const edgeState = state.edges.get(edgeId);
      if (edgeState?.owner) return;
      commitMove(edgeId);
    },
    [state, commitMove],
  );

  // Drag start on vertex
  const handleVertexPointerDown = useCallback(
    (vertexId: string, _e: React.PointerEvent) => {
      if (!state) return;
      setDragVertex(vertexId);
      setDragOverVertex(null);
    },
    [state],
  );

  // Drag over vertex
  const handleVertexPointerEnter = useCallback(
    (vertexId: string) => {
      if (dragVertex && vertexId !== dragVertex) {
        setDragOverVertex(vertexId);
      }
    },
    [dragVertex],
  );

  // Drag end — commit the move
  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (dragVertex && dragOverVertex) {
        const edgeId = findEdge(dragVertex, dragOverVertex);
        if (edgeId) {
          const edgeState = state?.edges.get(edgeId);
          if (edgeState && !edgeState.owner) {
            commitMove(edgeId);
          }
        }
      }
      setDragVertex(null);
      setDragOverVertex(null);
    },
    [dragVertex, dragOverVertex, findEdge, state, commitMove],
  );

  // Current player color
  const currentPlayer = state?.players[state?.currentPlayerIndex];
  const currentColor = currentPlayer ? PLAYER_COLORS[currentPlayer.color] : "var(--accent)";

  // The edge being dragged (for preview)
  const dragEdgeId = dragVertex && dragOverVertex ? findEdge(dragVertex, dragOverVertex) : null;
  const dragEdgeState = dragEdgeId ? state?.edges.get(dragEdgeId) : null;

  if (!state) return null;

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {/* Completed cells */}
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
            pointerEvents="none"
          />
        );
      })}

      {/* Drag preview line */}
      {dragVertex && dragOverVertex && !dragEdgeState && (() => {
        const vA = vertexPos.get(dragVertex);
        const vB = vertexPos.get(dragOverVertex);
        if (!vA || !vB) return null;
        return (
          <line
            x1={vA.x} y1={vA.y}
            x2={vB.x} y2={vB.y}
            stroke={currentColor}
            strokeWidth={0.02}
            strokeLinecap="round"
            opacity={0.5}
            pointerEvents="none"
            className={styles.dragPreview}
          />
        );
      })()}

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
          const isDragTarget = dragEdgeId === edge.id;

          const owner = isClaimed
            ? state.players.find((p) => p.id === edgeState.owner)
            : null;

          let strokeColor = "var(--edge-default)";
          let strokeWidth = 0.012;
          let opacity = 1;
          let edgeClass = styles.edge;

          if (isClaimed && owner) {
            strokeColor = PLAYER_COLORS[owner.color];
            strokeWidth = 0.018;
          } else if (isPending || isDragTarget) {
            strokeColor = currentColor;
            strokeWidth = 0.02;
            opacity = 0.6;
            edgeClass = `${styles.edge} ${styles.edgePending || "edgePending"}`;
          } else if (isHovered) {
            strokeColor = "var(--edge-hover)";
            strokeWidth = 0.016;
          }

          return (
            <g key={edge.id}>
              {/* Hit area */}
              {!isClaimed && (
                <line
                  x1={vA.x} y1={vA.y}
                  x2={vB.x} y2={vB.y}
                  stroke="transparent"
                  strokeWidth={0.06}
                  className={styles.hitArea}
                  onClick={() => handleEdgeClick(edge.id)}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edge ${edge.vertexA} to ${edge.vertexB}`}
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
                x1={vA.x} y1={vA.y}
                x2={vB.x} y2={vB.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
                className={edgeClass}
                pointerEvents="none"
              />
            </g>
          );
        })}

      {/* Vertices (draggable dots) */}
      {board.vertices.map((vertex) => {
        const isConnectedToClaimed = board.edges.some((e) => {
          if (e.vertexA !== vertex.id && e.vertexB !== vertex.id) return false;
          return state.edges.get(e.id)?.owner != null;
        });

        const isDragSource = dragVertex === vertex.id;
        const isDragTargetVertex = dragOverVertex === vertex.id;
        const isClaimable = (vertexEdges.get(vertex.id) || []).some((eid) => {
          const es = state.edges.get(eid);
          return es && !es.owner;
        });

        let r = isConnectedToClaimed ? 0.018 : 0.013;
        let fill = "var(--vertex-default)";

        if (isDragSource) {
          r = 0.022;
          fill = currentColor;
        } else if (isDragTargetVertex) {
          r = 0.02;
          fill = currentColor;
        } else if (isClaimable) {
          // Slightly brighter for claimable vertices
          fill = "var(--vertex-active)";
        }

        return (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={r}
            fill={fill}
            className={`${styles.vertex} ${isClaimable ? styles.vertexDraggable : ""}`}
            onPointerDown={(e) => handleVertexPointerDown(vertex.id, e)}
            onPointerEnter={() => handleVertexPointerEnter(vertex.id)}
            style={{ cursor: isClaimable ? "grab" : "default" }}
          />
        );
      })}
    </svg>
  );
}
