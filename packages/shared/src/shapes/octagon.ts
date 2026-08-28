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

  // Generate concentric rings
  const allRings: string[][] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const radius = (ring / rings) * 0.4;
    const numVertices = 8 * ring;
    const ringVertices: string[] = [];

    for (let i = 0; i < numVertices; i++) {
      const angle = (2 * Math.PI * i) / numVertices - Math.PI / 8;
      const x = 0.5 + radius * Math.cos(angle);
      const y = 0.5 + radius * Math.sin(angle);
      const vId = `v-${ring}-${i}`;

      vertices.push({ id: vId, x, y });
      ringVertices.push(vId);
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

  // Connect consecutive rings
  for (let r = 0; r < allRings.length - 1; r++) {
    const rInner = allRings[r];
    const rOuter = allRings[r + 1];
    const n = rInner.length;
    const m = rOuter.length;

    let i = 0;
    let j = 0;

    while (i < n || j < m) {
      if (i === n && j === m) break;

      const nextI = i + 1;
      const nextJ = j + 1;

      let advanceInner = false;
      if (i === n) {
        advanceInner = false;
      } else if (j === m) {
        advanceInner = true;
      } else {
        const fracI = nextI / n;
        const fracJ = nextJ / m;
        // Float comparison with small epsilon
        if (Math.abs(fracI - fracJ) < 1e-9) {
          advanceInner = false; // Always advance outer on ties
        } else if (fracI < fracJ) {
          advanceInner = true;
        } else {
          advanceInner = false;
        }
      }

      if (advanceInner) {
        const vO = rOuter[j % m];
        const vI = rInner[i % n];
        const vINext = rInner[nextI % n];

        const e1 = addEdge(vO, vI);
        const e2 = addEdge(vI, vINext);
        const e3 = addEdge(vINext, vO);

        cells.push({
          id: `c-${cellCounter++}`,
          type: 'triangle',
          edgeIds: [e1, e2, e3],
          vertexIds: [vO, vI, vINext],
        });
        i = nextI;
      } else {
        const vI = rInner[i % n];
        const vO = rOuter[j % m];
        const vONext = rOuter[nextJ % m];

        const e1 = addEdge(vI, vO);
        const e2 = addEdge(vO, vONext);
        const e3 = addEdge(vONext, vI);

        cells.push({
          id: `c-${cellCounter++}`,
          type: 'triangle',
          edgeIds: [e1, e2, e3],
          vertexIds: [vI, vO, vONext],
        });
        j = nextJ;
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
