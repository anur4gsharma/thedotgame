import type { BoardDefinition, VertexDef, EdgeDef, CellDef } from "../types/index.js";

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
  name?: string,
): BoardDefinition {
  const vertices: VertexDef[] = [];
  const edges: EdgeDef[] = [];
  const cells: CellDef[] = [];
  let edgeCounter = 0;

  // Helper to create an edge (avoids duplicates)
  const addEdge = (vA: string, vB: string, claimable = true): string => {
    const existing = edges.find((e) => {
      return (
        (e.vertexA === vA && e.vertexB === vB) ||
        (e.vertexA === vB && e.vertexB === vA)
      );
    });
    if (existing) return existing.id;
    const id = `e-${edgeCounter++}`;
    edges.push({ id, vertexA: vA, vertexB: vB, claimable });
    return id;
  };

  // Center vertex
  vertices.push({ id: "v-center", x: 0.5, y: 0.5 });

  // Generate concentric rings
  const allRings: string[][] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const radius = (ring / rings) * 0.4;
    const numVertices = ring === rings ? 8 : 8 * ring; // Outer ring is octagonal (8 vertices)
    const ringVertices: string[] = [];

    for (let i = 0; i < numVertices; i++) {
      const angle =
        ring === rings
          ? (2 * Math.PI * i) / 8 - Math.PI / 8 // Octagonal alignment
          : (2 * Math.PI * i) / numVertices;

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
      const e1 = addEdge("v-center", inner[i]);
      const e2 = addEdge("v-center", inner[next]);
      const e3 = addEdge(inner[i], inner[next]);

      cells.push({
        id: `tri-c-${i}`,
        type: "triangle",
        edgeIds: [e1, e2, e3],
        vertexIds: ["v-center", inner[i], inner[next]],
      });
    }
  }

  // Connect consecutive rings
  for (let r = 0; r < allRings.length - 1; r++) {
    const inner = allRings[r];
    const outer = allRings[r + 1];

    // For each outer vertex, find the nearest inner vertex and create triangles
    // Use a marching approach around the ring
    let innerIdx = 0;

    for (let i = 0; i < outer.length; i++) {
      const vOuter = outer[i];
      const vOuterNext = outer[(i + 1) % outer.length];

      // Calculate angle of this outer vertex
      const outerAngle = (2 * Math.PI * i) / outer.length;

      // Find the inner vertex closest to this angle
      while (innerIdx < inner.length - 1) {
        const angleCurr = (2 * Math.PI * innerIdx) / inner.length;
        const angleNext =
          (2 * Math.PI * ((innerIdx + 1) % inner.length)) / inner.length;

        const distCurr = Math.abs(angleCurr - outerAngle);
        const distNext = Math.abs(angleNext - outerAngle);

        // Handle wraparound
        const d1 = Math.min(distCurr, 2 * Math.PI - distCurr);
        const d2 = Math.min(distNext, 2 * Math.PI - distNext);

        if (d2 < d1) {
          innerIdx++;
        } else {
          break;
        }
      }

      const vInner = inner[innerIdx];
      const vInnerNext = inner[(innerIdx + 1) % inner.length];

      // Create edges
      const eOuter = addEdge(vOuter, vOuterNext);
      const eBridge1 = addEdge(vOuter, vInner);
      const eBridge2 = addEdge(vOuterNext, vInnerNext);

      // Triangle 1: outer[i], outer[i+1], inner[innerIdx]
      cells.push({
        id: `tri-${r + 1}-${i}-a`,
        type: "triangle",
        edgeIds: [eOuter, eBridge1, eBridge2],
        vertexIds: [vOuter, vOuterNext, vInner],
      });

      // If there are more inner vertices between innerIdx and innerIdx+1,
      // create additional triangles
      if (inner.length > outer.length) {
        // Connect outer[i] to additional inner vertices
        for (let j = 1; j < Math.ceil(inner.length / outer.length); j++) {
          const nextInnerIdx = (innerIdx + j) % inner.length;
          const vInnerJ = inner[nextInnerIdx];
          const eBridge = addEdge(vOuter, vInnerJ);

          // Find previous inner vertex edge
          const prevInnerIdx = (innerIdx + j - 1) % inner.length;
          const vInnerPrev = inner[prevInnerIdx];
          const ePrevBridge = edges.find(
            (e) =>
              (e.vertexA === vOuter && e.vertexB === vInnerPrev) ||
              (e.vertexA === vInnerPrev && e.vertexB === vOuter),
          );

          if (ePrevBridge) {
            const eInner = addEdge(vInnerPrev, vInnerJ);
            cells.push({
              id: `tri-${r + 1}-${i}-b-${j}`,
              type: "triangle",
              edgeIds: [ePrevBridge.id, eBridge, eInner],
              vertexIds: [vOuter, vInnerPrev, vInnerJ],
            });
          }
        }
      }
    }
  }

  return {
    id: id || `octagon-${rings}`,
    name: name || `Octagon (rings ${rings})`,
    cellType: "triangle",
    symmetry: "radial",
    vertices,
    edges,
    cells,
    metadata: {
      description: `An octagonal silhouette with ${cells.length} triangular cells`,
      recommendedPlayerCount: { min: 2, max: 4 },
      difficulty: "hard",
    },
  };
}

// ─── Predefined Sizes ───────────────────────────────────

export const OCTAGON_2 = generateOctagonBoard(2, "octagon-2", "Octagon (rings 2)");
export const OCTAGON_3 = generateOctagonBoard(3, "octagon-3", "Octagon (rings 3)");
