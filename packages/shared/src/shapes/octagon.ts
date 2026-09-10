import type { BoardDefinition, VertexDef, EdgeDef, CellDef } from '../types/index.js';

/**
 * Generate an octagonal silhouette board using triangular cells.
 *
 * Strategy: Create an octagonal boundary and use fan triangulation from the center.
 * This produces a clean, convex triangulation that's easy to validate.
 *
 * For larger boards, add intermediate rings of vertices.
 */
export function generateOctagonBoard(
  rings: number,
  id?: string,
  name?: string
): BoardDefinition {
  if (!Number.isInteger(rings) || rings < 1) {
    throw new Error(`rings must be a positive integer, got ${rings}`);
  }

  const vertices: VertexDef[] = [];
  const edges: EdgeDef[] = [];
  const cells: CellDef[] = [];
  let edgeCounter = 0;
  let cellCounter = 0;

  // Helper to create an edge (avoids duplicates)
  const addEdge = (vA: string, vB: string, claimable = true): string => {
    const existing = edges.find((e) => {
      return (
        (e.vertexA === vA && e.vertexB === vB) ||
        (e.vertexA === vB && e.vertexB === vA)
      );
    });
    if (existing) return existing.id;
    const edgeId = `e-${edgeCounter++}`;
    edges.push({ id: edgeId, vertexA: vA, vertexB: vB, claimable });
    return edgeId;
  };

  // Center vertex
  vertices.push({ id: 'v-center', x: 0.5, y: 0.5 });

  // ── Octagon corner angles ──────────────────────────────
  // A regular octagon has 8 corners. We start at -π/8 so the first
  // flat side sits across the top.  Corner k is at angle:
  //   θ_k = k * π/4 − π/8
  const SIDES = 8;
  const CORNER_STEP = (2 * Math.PI) / SIDES;        // π/4
  const ANGLE_OFFSET = -Math.PI / SIDES;             // −π/8

  /**
   * Return the (x, y) of a point that lies on a regular octagon
   * of the given `radius` (circumradius), centred at (cx, cy).
   *
   * `side`  – which of the 8 sides (0‒7)
   * `frac`  – fractional position along that side (0 = start corner, 1 = end corner)
   */
  function octPoint(
    cx: number, cy: number, radius: number,
    side: number, frac: number,
  ): { x: number; y: number } {
    const a0 = side * CORNER_STEP + ANGLE_OFFSET;
    const a1 = (side + 1) * CORNER_STEP + ANGLE_OFFSET;
    const x0 = cx + radius * Math.cos(a0);
    const y0 = cy + radius * Math.sin(a0);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    return { x: x0 + (x1 - x0) * frac, y: y0 + (y1 - y0) * frac };
  }

  // Generate concentric octagonal rings
  const allRings: string[][] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const radius = (ring / rings) * 0.4;
    const dotsPerSide = ring;                         // 8 * ring total
    const ringVertices: string[] = [];

    for (let side = 0; side < SIDES; side++) {
      for (let d = 0; d < dotsPerSide; d++) {
        const frac = d / dotsPerSide;                 // 0 .. (dotsPerSide-1)/dotsPerSide
        const { x, y } = octPoint(0.5, 0.5, radius, side, frac);
        const vId = `v-${ring}-${side * dotsPerSide + d}`;

        vertices.push({ id: vId, x, y });
        ringVertices.push(vId);
      }
    }

    allRings.push(ringVertices);
  }

  // Create triangles from center to innermost ring (fan triangulation)
  if (allRings.length > 0) {
    const inner = allRings[0];
    for (let i = 0; i < inner.length; i++) {
      const next = (i + 1) % inner.length;
      const e1 = addEdge('v-center', inner[i]);
      const e2 = addEdge(inner[i], inner[next]);
      const e3 = addEdge(inner[next], 'v-center');

      cells.push({
        id: `c-${cellCounter++}`,
        type: 'triangle',
        edgeIds: [e1, e2, e3],
        vertexIds: ['v-center', inner[i], inner[next]],
      });
    }
  }

  // Connect consecutive rings per-side with symmetric triangulation
  for (let r = 0; r < allRings.length - 1; r++) {
    const rInner = allRings[r];
    const rOuter = allRings[r + 1];
    const segsInner = r + 1;
    const segsOuter = r + 2;

    for (let side = 0; side < SIDES; side++) {
      const V: string[] = [];
      for (let k = 0; k <= segsInner; k++) {
        V.push(rInner[(side * segsInner + k) % rInner.length]);
      }
      const W: string[] = [];
      for (let k = 0; k <= segsOuter; k++) {
        W.push(rOuter[(side * segsOuter + k) % rOuter.length]);
      }

      let i = 0;
      let j = 0;
      while (i < segsInner || j < segsOuter) {
        if (i === segsInner) {
          const e1 = addEdge(W[j], W[j + 1]);
          const e2 = addEdge(W[j + 1], V[i]);
          const e3 = addEdge(V[i], W[j]);
          cells.push({
            id: `c-${cellCounter++}`,
            type: 'triangle',
            edgeIds: [e1, e2, e3],
            vertexIds: [W[j], W[j + 1], V[i]],
          });
          j++;
        } else if (j === segsOuter) {
          const e1 = addEdge(V[i], V[i + 1]);
          const e2 = addEdge(V[i + 1], W[j]);
          const e3 = addEdge(W[j], V[i]);
          cells.push({
            id: `c-${cellCounter++}`,
            type: 'triangle',
            edgeIds: [e1, e2, e3],
            vertexIds: [V[i], V[i + 1], W[j]],
          });
          i++;
        } else {
          const midV = (i + 0.5) / segsInner;
          const midW = (j + 0.5) / segsOuter;
          if (midW < midV) {
            const e1 = addEdge(W[j], W[j + 1]);
            const e2 = addEdge(W[j + 1], V[i]);
            const e3 = addEdge(V[i], W[j]);
            cells.push({
              id: `c-${cellCounter++}`,
              type: 'triangle',
              edgeIds: [e1, e2, e3],
              vertexIds: [V[i], W[j], W[j + 1]],
            });
            j++;
          } else {
            const e1 = addEdge(V[i], V[i + 1]);
            const e2 = addEdge(V[i + 1], W[j]);
            const e3 = addEdge(W[j], V[i]);
            cells.push({
              id: `c-${cellCounter++}`,
              type: 'triangle',
              edgeIds: [e1, e2, e3],
              vertexIds: [W[j], V[i], V[i + 1]],
            });
            i++;
          }
        }
      }
    }
  }

  // Validate all cells
  for (const cell of cells) {
    if (cell.vertexIds.length !== 3) {
      throw new Error(`Cell ${cell.id} has ${cell.vertexIds.length} vertices, expected 3`);
    }
    if (cell.edgeIds.length !== 3) {
      throw new Error(`Cell ${cell.id} has ${cell.edgeIds.length} edges, expected 3`);
    }
    const cellVertices = new Set(cell.vertexIds);
    for (const edgeId of cell.edgeIds) {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) {
        throw new Error(`Cell ${cell.id} references non-existent edge ${edgeId}`);
      }
      if (!cellVertices.has(edge.vertexA) || !cellVertices.has(edge.vertexB)) {
        throw new Error(`Cell ${cell.id} edge ${edgeId} connects vertices not in cell`);
      }
    }
  }

  return {
    id: id || `octagon-${rings}`,
    name: name || `Octagon (rings ${rings})`,
    cellType: 'triangle',
    symmetry: 'radial',
    vertices,
    edges,
    cells,
    metadata: {
      description: `An octagonal silhouette with ${cells.length} triangular cells`,
      recommendedPlayerCount: { min: 2, max: 4 },
      difficulty: 'hard',
    },
  };
}

// ─── Predefined Sizes ───────────────────────────────────

export const OCTAGON_2 = generateOctagonBoard(2, 'octagon-2', 'Octagon (rings 2)');
export const OCTAGON_3 = generateOctagonBoard(3, 'octagon-3', 'Octagon (rings 3)');
