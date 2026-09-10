import { useCallback, useMemo, useRef, useState } from "react";
import { useGameStore } from "../../store/game-store";
import { DEFAULT_BOARD_VISUAL, type BoardDefinition, type PlayerColor } from "@dots-game/shared";
import styles from "./board.module.css";

const PLAYER_INDEX: Record<PlayerColor, number> = { blue: 0, red: 1, green: 2, orange: 3 };

interface BoardRendererProps {
  board: BoardDefinition;
}

export function BoardRenderer({ board }: BoardRendererProps) {
  const visual = board.config?.visual ?? DEFAULT_BOARD_VISUAL;
  const state = useGameStore((s) => s.state);
  const pendingEdge = useGameStore((s) => s.pendingEdge);
  const makeLocalMove = useGameStore((s) => s.makeLocalMove);
  const makeMultiplayerMove = useGameStore((s) => s.makeMultiplayerMove);
  const mode = useGameStore((s) => s.mode);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragVertex, setDragVertex] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  const viewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const v of board.vertices) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const pad = board.config?.visual.padding ?? 0.15;
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

  const dotRadius = 0.015 * visual.dotSize;
  const hitRadius = 0.22;

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

  /** Find the closest vertex that has an unclaimed edge to `source`. */
  const findClosestValidTarget = useCallback(
    (px: number, py: number, source: string): string | null => {
      const sourceEdges = vertexEdges.get(source) || [];
      let closest: string | null = null;
      let minDist = hitRadius;
      for (const eid of sourceEdges) {
        const edgeState = state?.edges.get(eid);
        if (edgeState?.owner) continue; // already claimed
        const pair = edgeVertices.get(eid);
        if (!pair) continue;
        const neighborId = pair.a === source ? pair.b : pair.a;
        const v = vertexPos.get(neighborId);
        if (!v) continue;
        const dx = v.x - px;
        const dy = v.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          closest = neighborId;
        }
      }
      return closest;
    },
    [vertexEdges, edgeVertices, vertexPos, state, hitRadius],
  );

  const handlePointerDown = useCallback(
    (vertexId: string, e: React.PointerEvent) => {
      if (!state) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragVertex(vertexId);
      const pos = vertexPos.get(vertexId);
      if (pos) setPointerPos({ x: pos.x, y: pos.y });
      setDragTarget(null);
    },
    [state, vertexPos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (!svgPt) return;

      if (dragVertex) {
        setPointerPos(svgPt);
        const target = findClosestValidTarget(svgPt.x, svgPt.y, dragVertex);
        if (target) {
          setDragTarget((current) => current === target ? current : target);
        } else {
          setDragTarget((current) => current === null ? current : null);
        }
      }
    },
    [dragVertex, toSVGCoords, findClosestValidTarget]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragVertex || !state) {
        setDragVertex(null);
        setPointerPos(null);
        setDragTarget(null);
        return;
      }

      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (svgPt) {
        const target = dragTarget ?? findClosestValidTarget(svgPt.x, svgPt.y, dragVertex);
        if (target) {
          const edgeId = findEdge(dragVertex, target);
          if (edgeId) {
            commitMove(edgeId);
          }
        }
      }

      setDragVertex(null);
      setPointerPos(null);
      setDragTarget(null);
    },
    [dragVertex, dragTarget, state, toSVGCoords, findClosestValidTarget, findEdge, commitMove],
  );

  const currentPlayer = state?.players[state?.currentPlayerIndex];
  const canPlay = state?.status === "playing";
  const currentColor = currentPlayer ? visual.playerColors[PLAYER_INDEX[currentPlayer.color]] : visual.turnColor;
  const lastMoveId = state?.moveHistory[state.moveHistory.length - 1]?.edgeId;
  const dragEdge = dragVertex && dragTarget ? findEdge(dragVertex, dragTarget) : null;

  if (!state) return null;

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { setDragVertex(null); setPointerPos(null); setDragTarget(null); }}
      style={{ touchAction: "none" }}
      role="application"
    >
      <defs>
        <pattern id="graph-paper" x="0" y="0" width="0.1" height="0.1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0.1" y2="0" stroke="var(--border)" strokeWidth="0.002" />
          <line x1="0" y1="0" x2="0" y2="0.1" stroke="var(--border)" strokeWidth="0.002" />
        </pattern>
      </defs>

      <rect x="-10" y="-10" width="20" height="20" fill={visual.backgroundColor} pointerEvents="none" />

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
            fill={visual.completedCellColors[PLAYER_INDEX[player.color]]}
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
          const isHovered = dragEdge === edge.id;
          const isLastMove = lastMoveId === edge.id;

          const owner = isClaimed
            ? state.players.find((p) => p.id === edgeState.owner)
            : null;

          if (!isClaimed && !isPending && !isHovered) return null;

          let strokeColor = visual.lineColor;
          let strokeWidth = 0.016;
          let opacity = isClaimed ? 1 : 0.45;
          let edgeClass = styles.edge;
          
          if (isClaimed && owner) {
            strokeColor = visual.playerColors[PLAYER_INDEX[owner.color]];
            if (isLastMove) {
              strokeWidth = 0.024; // Thicker for last move
            }
            edgeClass = `${styles.edge} ${styles.edgeDrawn || ""}`;
          } else if (isPending || isHovered) {
            strokeColor = currentColor;
            opacity = isPending ? 0.6 : 0.45;
            edgeClass = `${styles.edge} ${isPending ? styles.edgePending : styles.edgeSnap}`;
          }

          return (
            <g key={edge.id}>
              <line
                x1={vA.x} y1={vA.y}
                x2={vB.x} y2={vB.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth * visual.lineThickness}
                opacity={opacity}
                strokeLinecap="round"
                className={edgeClass}
                pathLength={1}
                pointerEvents="none"
              />
            </g>
          );
        })}


      {/* Drag preview: the line snaps to a valid neighbouring dot. */}
      {dragVertex && pointerPos && (() => {
        const vA = vertexPos.get(dragVertex);
        if (!vA) return null;
        const vB = dragTarget ? vertexPos.get(dragTarget) : pointerPos;
        if (!vB) return null;
        return (
          <line
            x1={vA.x} y1={vA.y}
            x2={vB.x} y2={vB.y}
            stroke={currentColor}
            strokeWidth={dragTarget ? 0.024 : 0.014}
            strokeLinecap="round"
            opacity={dragTarget ? 0.85 : 0.32}
            className={dragTarget ? styles.dragSnap : styles.dragPreview}
            pointerEvents="none"
          />
        );
      })()}

      {/* Vertices */}
      {board.vertices.map((vertex) => {
        const isDragSource = dragVertex === vertex.id;
        const isDragTarget = dragTarget === vertex.id;

        return (
          <g key={vertex.id}>
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={Math.max(dotRadius * 3, 0.045)}
              fill="transparent"
              className={styles.vertexHitArea}
              onPointerDown={(e) => { if (canPlay) handlePointerDown(vertex.id, e); }}
            />
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={isDragSource ? dotRadius * 1.5 : isDragTarget ? dotRadius * 1.8 : dotRadius}
              fill={isDragSource ? currentColor : isDragTarget ? currentColor : visual.dotColor}
              className={`${styles.vertex} ${isDragTarget ? styles.vertexSnap : ""}`}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </svg>
  );
}
