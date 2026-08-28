import type { BoardDefinition, VertexDef, EdgeDef, CellDef } from "../types/index.js";

/**
 * Generate a square grid board.
 *
 * For a grid of (cols+1) × (rows+1) vertices:
 * - Vertices: (cols+1) × (rows+1) points
 * - Horizontal edges: cols × (rows+1)
 * - Vertical edges: (cols+1) × rows
 * - Cells (squares): cols × rows
 *
 * Example: 5×5 vertices → 4×4 = 16 square cells
 */
export function generateSquareBoard(
  cols: number,
  rows: number,
  id?: string,
  name?: string,
): BoardDefinition {
  const width = cols + 1;
  const height = rows + 1;

  // Generate vertices
  const vertices: VertexDef[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      vertices.push({
        id: `v-${x}-${y}`,
        x: x / cols, // Normalized 0..1
        y: y / rows,
      });
    }
  }

  // Generate edges
  const edges: EdgeDef[] = [];

  // Horizontal edges: between (x,y) and (x+1,y)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < cols; x++) {
      edges.push({
        id: `h-${x}-${y}`,
        vertexA: `v-${x}-${y}`,
        vertexB: `v-${x + 1}-${y}`,
        claimable: true,
      });
    }
  }

  // Vertical edges: between (x,y) and (x,y+1)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      edges.push({
        id: `v-${x}-${y}`,
        vertexA: `v-${x}-${y}`,
        vertexB: `v-${x}-${y + 1}`,
        claimable: true,
      });
    }
  }

  // Generate cells (squares)
  const cells: CellDef[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        id: `c-${x}-${y}`,
        type: "square",
        edgeIds: [
          `h-${x}-${y}`,     // top
          `v-${x}-${y}`,     // left
          `h-${x}-${y + 1}`, // bottom
          `v-${x + 1}-${y}`, // right
        ],
        vertexIds: [
          `v-${x}-${y}`,
          `v-${x + 1}-${y}`,
          `v-${x + 1}-${y + 1}`,
          `v-${x}-${y + 1}`,
        ],
      });
    }
  }

  return {
    id: id || `square-${cols}x${rows}`,
    name: name || `${cols}×${rows} Square Grid`,
    cellType: "square",
    symmetry: "rectangular",
    vertices,
    edges,
    cells,
    metadata: {
      description: `A ${cols}×${rows} square grid with ${cols * rows} cells`,
      recommendedPlayerCount: { min: 2, max: 4 },
      difficulty: "easy",
    },
  };
}

// ─── Predefined Sizes ───────────────────────────────────

export const SQUARE_3X3 = generateSquareBoard(3, 3, "square-3x3", "3×3 Square");
export const SQUARE_4X4 = generateSquareBoard(4, 4, "square-4x4", "4×4 Square");
export const SQUARE_5X5 = generateSquareBoard(5, 5, "square-5x5", "5×5 Square");
export const SQUARE_6X6 = generateSquareBoard(6, 6, "square-6x6", "6×6 Square");
