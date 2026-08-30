import { useCallback, useMemo, useRef, useState } from "react";
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

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragVertex, setDragVertex] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const viewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const v of board.vertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const pad = 0.15;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [board]);

  const vertexPos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const v of board.vertices) map.set(v.id, v);
    return map;
  }, [board]);

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

  const edgeVertices = useMemo(() => {
    const map = new Map<string, { a: string; b: string }>();
    for (const edge of board.edges) {
      map.set(edge.id, { a: edge.vertexA, b: edge.vertexB });
    }
    return map;
  }, [board]);

  const dotRadius = 0.015;
  const hitRadius = 0.05;

  const commitMove = useCallback(
    (edgeId: string) => {
      if (mode === "local") makeLocalMove(edgeId);
      else makeMultiplayerMove(edgeId);
    },
    [mode, makeLocalMove, makeMultiplayerMove],
  );

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

  const toSVGCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    [],
  );

  const findClosestVertex = useCallback(
    (px: number, py: number, exclude?: string): string | null => {
      let closest: string | null = null;
      let minDist = hitRadius;
      for (const v of board.vertices) {
        if (v.id === exclude) continue;
        const dx = v.x - px;
        const dy = v.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          closest = v.id;
        }
      }
      return closest;
    },
    [board, hitRadius],
  );

  const handlePointerDown = useCallback(
    (vertexId: string, e: React.PointerEvent) => {
      if (!state) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragVertex(vertexId);
      const pos = vertexPos.get(vertexId);
      if (pos) setPointerPos({ x: pos.x, y: pos.y });
    },
    [state, vertexPos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (!svgPt) return;

      if (dragVertex) {
        setPointerPos(svgPt);
        
        // Snap preview line to nearest valid vertex
        const target = findClosestVertex(svgPt.x, svgPt.y, dragVertex);
        if (target) {
          const edgeId = findEdge(dragVertex, target);
          if (edgeId) {
            const edgeState = state?.edges.get(edgeId);
            if (!edgeState?.owner) {
               setHoverEdge(edgeId);
               return;
            }
          }
        }
        setHoverEdge(null);
      }
    },
    [dragVertex, toSVGCoords, findClosestVertex, findEdge, state]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragVertex || !state) {
        setDragVertex(null);
        setPointerPos(null);
        setHoverEdge(null);
        return;
      }

      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (svgPt) {
        const target = findClosestVertex(svgPt.x, svgPt.y, dragVertex);
        if (target) {
          const edgeId = findEdge(dragVertex, target);
          if (edgeId) {
            const edgeState = state.edges.get(edgeId);
            if (edgeState && !edgeState.owner) {
              commitMove(edgeId);
            }
          }
        }
      }

      setDragVertex(null);
      setPointerPos(null);
      setHoverEdge(null);
    },
    [dragVertex, state, toSVGCoords, findClosestVertex, findEdge, commitMove],
  );

  const currentPlayer = state?.players[state?.currentPlayerIndex];
  const currentColor = currentPlayer ? PLAYER_COLORS[currentPlayer.color] : "var(--accent)";
  const lastMoveId = state?.moveHistory[state.moveHistory.length - 1]?.edgeId;

  if (!state) return null;

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { setDragVertex(null); setPointerPos(null); setHoverEdge(null); }}
      style={{ touchAction: "none" }}
      role="application"
    >
      <defs>
        <pattern id="graph-paper" x="0" y="0" width="0.1" height="0.1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0.1" y2="0" stroke="var(--border)" strokeWidth="0.002" />
          <line x1="0" y1="0" x2="0" y2="0.1" stroke="var(--border)" strokeWidth="0.002" />
        </pattern>
      </defs>

      <rect x="-10" y="-10" width="20" height="20" fill="url(#graph-paper)" pointerEvents="none" />

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

      {/* All claimable edges (for hover zones & backgrounds) */}
      {board.edges
        .filter((e) => e.claimable)
        .map((edge) => {
          const vA = vertexPos.get(edge.vertexA);
          const vB = vertexPos.get(edge.vertexB);
          if (!vA || !vB) return null;

          const edgeState = state.edges.get(edge.id);
          const isClaimed = edgeState?.owner != null;
          const isPending = pendingEdge === edge.id;
          const isHovered = hoverEdge === edge.id;
          const isLastMove = lastMoveId === edge.id;

          const owner = isClaimed
            ? state.players.find((p) => p.id === edgeState.owner)
            : null;

          let strokeColor = "transparent";
          let strokeWidth = 0.016;
          let opacity = 1;
          let edgeClass = styles.edge;
          
          if (isClaimed && owner) {
            strokeColor = PLAYER_COLORS[owner.color];
            if (isLastMove) {
              strokeWidth = 0.024; // Thicker for last move
            }
            edgeClass = `${styles.edge} ${styles.edgeDrawn || ""}`;
          } else if (isPending || isHovered) {
            strokeColor = currentColor;
            opacity = 0.3;
            edgeClass = `${styles.edge} ${isPending ? styles.edgePending : ""}`;
          }

          return (
            <line
              key={edge.id}
              x1={vA.x} y1={vA.y}
              x2={vB.x} y2={vB.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeLinecap="round"
              className={edgeClass}
              pointerEvents="none"
            />
          );
        })}

      {/* Drag preview line (freeform fallback) */}
      {dragVertex && pointerPos && !hoverEdge && (() => {
        const vA = vertexPos.get(dragVertex);
        if (!vA) return null;
        return (
          <line
            x1={vA.x} y1={vA.y}
            x2={pointerPos.x} y2={pointerPos.y}
            stroke={currentColor}
            strokeWidth={0.012}
            strokeLinecap="round"
            opacity={0.2}
            pointerEvents="none"
          />
        );
      })()}

      {/* Vertices */}
      {board.vertices.map((vertex) => {
        const isDragSource = dragVertex === vertex.id;

        return (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={isDragSource ? dotRadius * 1.5 : dotRadius}
            fill={isDragSource ? currentColor : "var(--vertex-default)"}
            className={styles.vertex}
            onPointerDown={(e) => handlePointerDown(vertex.id, e)}
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </svg>
  );
}
