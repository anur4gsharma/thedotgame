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
  const dragLineRef = useRef<SVGLineElement>(null);
  
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);
  const dragStartDotRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const [hoverDot, setHoverDot] = useState<string | null>(null);
  const [candidateEdge, setCandidateEdge] = useState<string | null>(null);
  
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
  const hitRadius = 0.15; // Magnetic radius

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

  const findNearestDot = useCallback((x: number, y: number, maxDist: number) => {
    let nearest: string | null = null;
    let minDist = maxDist;
    for (const [id, pos] of vertexPos.entries()) {
      const dx = pos.x - x;
      const dy = pos.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearest = id;
      }
    }
    return nearest;
  }, [vertexPos]);

  const determineCandidateEdge = useCallback((startPos: {x: number, y: number}, currentPos: {x: number, y: number}, startDot: string | null) => {
    let bestEdge: string | null = null;
    
    if (startDot) {
      // If we started from a dot, we look for a valid neighbor
      const sourceEdges = vertexEdges.get(startDot) || [];
      let minDist = 0.35; // How far to snap to a neighbor
      for (const eid of sourceEdges) {
        const edgeState = state?.edges.get(eid);
        if (edgeState?.owner) continue;
        const pair = edgeVertices.get(eid);
        if (!pair) continue;
        const neighborId = pair.a === startDot ? pair.b : pair.a;
        const v = vertexPos.get(neighborId);
        if (!v) continue;
        
        // Is the current pointer moving towards this neighbor?
        // Check distance from currentPos to the neighbor
        const d = Math.sqrt((v.x - currentPos.x) ** 2 + (v.y - currentPos.y) ** 2);
        if (d < minDist) {
          minDist = d;
          bestEdge = eid;
        }
      }
    } else {
      // Free drag: find closest dot to start, closest dot to end
      const dot1 = findNearestDot(startPos.x, startPos.y, 0.4);
      const dot2 = findNearestDot(currentPos.x, currentPos.y, 0.4);
      if (dot1 && dot2 && dot1 !== dot2) {
        const edgeId = findEdge(dot1, dot2);
        if (edgeId) {
          const edgeState = state?.edges.get(edgeId);
          if (!edgeState?.owner) {
            bestEdge = edgeId;
          }
        }
      }
    }
    return bestEdge;
  }, [state, vertexEdges, edgeVertices, vertexPos, findNearestDot, findEdge]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!state || state.status !== "playing") return;
      
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (!svgPt) return;

      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      
      const nearest = findNearestDot(svgPt.x, svgPt.y, hitRadius);
      
      isDraggingRef.current = true;
      dragStartPosRef.current = svgPt;
      dragStartDotRef.current = nearest;
      
      setHoverDot(nearest);
      
      if (dragLineRef.current) {
        const startX = nearest ? vertexPos.get(nearest)!.x : svgPt.x;
        const startY = nearest ? vertexPos.get(nearest)!.y : svgPt.y;
        dragLineRef.current.setAttribute("x1", startX.toString());
        dragLineRef.current.setAttribute("y1", startY.toString());
        dragLineRef.current.setAttribute("x2", svgPt.x.toString());
        dragLineRef.current.setAttribute("y2", svgPt.y.toString());
        dragLineRef.current.style.opacity = "1";
      }
    },
    [state, toSVGCoords, findNearestDot, vertexPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (!svgPt) return;

      if (isDraggingRef.current && dragStartPosRef.current) {
        // Update raw DOM line
        if (dragLineRef.current) {
          dragLineRef.current.setAttribute("x2", svgPt.x.toString());
          dragLineRef.current.setAttribute("y2", svgPt.y.toString());
        }
        
        // Find candidate edge
        const edge = determineCandidateEdge(dragStartPosRef.current, svgPt, dragStartDotRef.current);
        setCandidateEdge(edge);
        
      } else {
        // Hover mode
        const nearest = findNearestDot(svgPt.x, svgPt.y, hitRadius);
        setHoverDot(nearest);
      }
    },
    [toSVGCoords, findNearestDot, determineCandidateEdge]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current && candidateEdge) {
        commitMove(candidateEdge);
      }
      
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      dragStartDotRef.current = null;
      
      if (dragLineRef.current) {
        dragLineRef.current.style.opacity = "0";
      }
      
      setCandidateEdge(null);
      // Re-evaluate hover immediately
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (svgPt) {
        setHoverDot(findNearestDot(svgPt.x, svgPt.y, hitRadius));
      }
    },
    [candidateEdge, commitMove, toSVGCoords, findNearestDot]
  );

  const currentPlayer = state?.players[state?.currentPlayerIndex];
  const currentColor = currentPlayer ? visual.playerColors[PLAYER_INDEX[currentPlayer.color]] : visual.turnColor;
  const lastMoveId = state?.moveHistory[state.moveHistory.length - 1]?.edgeId;

  if (!state) return null;

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
      role="application"
      data-cursor="board"
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
          const isCandidate = candidateEdge === edge.id;
          const isLastMove = lastMoveId === edge.id;

          const owner = isClaimed
            ? state.players.find((p) => p.id === edgeState.owner)
            : null;

          if (!isClaimed && !isPending && !isCandidate) return null;

          let strokeColor = visual.lineColor;
          let strokeWidth = 0.016;
          let opacity = isClaimed ? 1 : 0.45;
          let edgeClass = styles.edge;
          
          if (isClaimed && owner) {
            strokeColor = visual.playerColors[PLAYER_INDEX[owner.color]];
            if (isLastMove) strokeWidth = 0.024;
            edgeClass = `${styles.edge} ${styles.edgeDrawn || ""}`;
          } else if (isPending || isCandidate) {
            strokeColor = currentColor;
            opacity = isPending ? 0.6 : 0.85;
            strokeWidth = 0.024;
            edgeClass = `${styles.edge} ${isPending ? styles.edgePending : styles.dragSnap}`;
          }

          return (
            <line
              key={edge.id}
              x1={vA.x} y1={vA.y}
              x2={vB.x} y2={vB.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth * visual.lineThickness}
              opacity={opacity}
              strokeLinecap="round"
              className={edgeClass}
              pointerEvents="none"
            />
          );
        })}

      {/* Free drag line (controlled natively via refs) */}
      <line
        ref={dragLineRef}
        stroke={currentColor}
        strokeWidth={0.012}
        strokeLinecap="round"
        opacity="0"
        className={styles.dragPreview}
        pointerEvents="none"
      />

      {/* Vertices */}
      {board.vertices.map((vertex) => {
        const isHovered = hoverDot === vertex.id;
        // The dot is highlighted if it's the hover target OR if it's part of the candidate edge
        let isHighlighted = isHovered;
        if (candidateEdge) {
          const pair = edgeVertices.get(candidateEdge);
          if (pair && (pair.a === vertex.id || pair.b === vertex.id)) {
            isHighlighted = true;
          }
        }

        return (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={isHighlighted ? dotRadius * 1.6 : dotRadius}
            fill={isHighlighted ? currentColor : visual.dotColor}
            className={`${styles.vertex} ${isHighlighted ? styles.vertexSnap : ""}`}
            pointerEvents="none"
          />
        );
      })}
    </svg>
  );
}
