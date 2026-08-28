import type { BoardDefinition, VertexDef, EdgeDef, CellDef } from "../types/index.js";

/**
 * Generate a large triangular board using triangular cells.
 *
 * The triangle has side length `n`, meaning:
 * - Row r has (r+1) vertices
 * - Total vertices: n(n+1)/2
 * - Total triangular cells: n²
 *
 * The triangle points upward. Vertices are arranged in rows:
 *   Row 0: 1 vertex (top)
 *   Row 1: 2 vertices
 *   ...
 *   Row n: n+1 vertices (bottom)
 *
 * Edges connect adjacent vertices in three directions:
 * - Horizontal (left-right within a row)
 * - Diagonal down-left
 * - Diagonal down-right
 *
 * Cells are formed by groups of 3 edges:
 * - Upward-pointing triangles (point up)
 * - Downward-pointing triangles (point down)
 */
export function generateTriangleBoard(
  sideLength: number,
  id?: string,
  name?: string,
): BoardDefinition {
  const n = sideLength;

  // Generate vertices
  const vertices: VertexDef[] = [];
  for (let row = 0; row <= n; row++) {
    for (let col = 0; col <= row; col++) {
      // Position in a triangular layout
      // Center the triangle horizontally
      const x = (col - row / 2) / n + 0.5;
      const y = row / n;
      vertices.push({
        id: `v-${row}-${col}`,
        x,
        y,
      });
    }
  }

  // Generate edges
  const edges: EdgeDef[] = [];

  for (let row = 0; row <= n; row++) {
    for (let col = 0; col <= row; col++) {
      // Horizontal edge: (row, col) → (row, col+1) [if exists]
      if (col < row) {
        edges.push({
          id: `h-${row}-${col}`,
          vertexA: `v-${row}-${col}`,
          vertexB: `v-${row}-${col + 1}`,
          claimable: true,
        });
      }

      // Diagonal down-right: (row, col) → (row+1, col+1) [if exists]
      if (row < n) {
        edges.push({
          id: `dr-${row}-${col}`,
          vertexA: `v-${row}-${col}`,
          vertexB: `v-${row + 1}-${col + 1}`,
          claimable: true,
        });
      }

      // Diagonal down-left: (row, col) → (row+1, col) [if exists]
      if (row < n) {
        edges.push({
          id: `dl-${row}-${col}`,
          vertexA: `v-${row}-${col}`,
          vertexB: `v-${row + 1}-${col}`,
          claimable: true,
        });
      }
    }
  }

  // Generate cells (triangles)
  const cells: CellDef[] = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      // Upward-pointing triangle (point up)
      // Vertices: (row, col), (row, col+1), (row+1, col+1)
      // Edges: h(row,col), dr(row,col), dr(row,col+1) ... wait let me think about this more carefully

      // Upward-pointing triangle at (row, col):
      // Top vertex: (row, col)
      // Bottom-left: (row+1, col)
      // Bottom-right: (row+1, col+1)
      // Edges:
      //   - dl(row, col): (row, col) → (row+1, col) [left side]
      //   - dr(row, col): (row, col) → (row+1, col+1) [right side]
      //   - h(row+1, col): (row+1, col) → (row+1, col+1) [bottom]

      cells.push({
        id: `cu-${row}-${col}`,
        type: "triangle",
        edgeIds: [
          `dl-${row}-${col}`,    // left side
          `dr-${row}-${col}`,    // right side
          `h-${row + 1}-${col}`, // bottom
        ],
        vertexIds: [
          `v-${row}-${col}`,
          `v-${row + 1}-${col}`,
          `v-${row + 1}-${col + 1}`,
        ],
      });

      // Downward-pointing triangle at (row, col):
      // Only exists if col < row (there's a vertex to the right)
      // Top-left: (row, col)
      // Top-right: (row, col+1)
      // Bottom: (row+1, col+1)
      // Edges:
      //   - h(row, col): (row, col) → (row, col+1) [top]
      //   - dr(row, col): (row, col) → (row+1, col+1) [right side]
      //   - dl(row, col+1): ... wait, that's (row, col+1) → (row+1, col+1)
      //     which is dr(row, col+1)? No...

      // Let me reconsider the edge naming:
      // h-row-col: horizontal edge in row between col and col+1
      // dr-row-col: diagonal right from (row, col) to (row+1, col+1)
      // dl-row-col: diagonal left from (row, col) to (row+1, col)

      // Downward triangle:
      // Top-left: (row, col)
      // Top-right: (row, col+1)
      // Bottom: (row+1, col+1)
      // Edges:
      //   - h(row, col): (row, col) → (row, col+1) [top]
      //   - dr(row, col): (row, col) → (row+1, col+1) [right side]
      //   - dl(row, col+1): (row, col+1) → (row+1, col+1) ... wait

      // Actually, dl-row-col connects (row, col) to (row+1, col)
      // So for the downward triangle, the left side is:
      // (row, col+1) → (row+1, col+1)
      // That's dl(row, col+1)? No, dl connects (row, col) to (row+1, col)
      // So dl(row, col+1) connects (row, col+1) to (row+1, col+1) ✓

      if (col < row) {
        cells.push({
          id: `cd-${row}-${col}`,
          type: "triangle",
          edgeIds: [
            `h-${row}-${col}`,      // top
            `dr-${row}-${col}`,     // left side (goes to bottom vertex)
            `dl-${row}-${col + 1}`, // right side (from top-right to bottom)
          ],
          vertexIds: [
            `v-${row}-${col}`,
            `v-${row}-${col + 1}`,
            `v-${row + 1}-${col + 1}`,
          ],
        });
      }
    }
  }

  return {
    id: id || `triangle-${n}`,
    name: name || `Triangle (side ${n})`,
    cellType: "triangle",
    symmetry: "triangular",
    vertices,
    edges,
    cells,
    metadata: {
      description: `A large triangle with side length ${n}, containing ${n * n} triangular cells`,
      recommendedPlayerCount: { min: 2, max: 4 },
      difficulty: "medium",
    },
  };
}

// ─── Predefined Sizes ───────────────────────────────────

export const TRIANGLE_3 = generateTriangleBoard(3, "triangle-3", "Triangle (side 3)");
export const TRIANGLE_4 = generateTriangleBoard(4, "triangle-4", "Triangle (side 4)");
export const TRIANGLE_5 = generateTriangleBoard(5, "triangle-5", "Triangle (side 5)");
