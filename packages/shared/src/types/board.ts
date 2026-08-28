// ─── Cell Types ─────────────────────────────────────────

export type CellType = "square" | "triangle";

// ─── Board Symmetry ─────────────────────────────────────

export type BoardSymmetry =
  | "rectangular"
  | "triangular"
  | "radial"
  | "irregular";

// ─── Vertex ─────────────────────────────────────────────

/**
 * A vertex (point) on the board.
 * Coordinates are normalized for rendering; the game engine uses only IDs.
 */
export interface VertexDef {
  id: string;
  x: number;
  y: number;
}

// ─── Edge ───────────────────────────────────────────────

/**
 * An edge connecting two vertices.
 * Edges are the claimable boundaries in the game.
 */
export interface EdgeDef {
  id: string;
  vertexA: string;
  vertexB: string;
  claimable: boolean;
}

// ─── Cell ───────────────────────────────────────────────

/**
 * A fundamental cell (region) bounded by edges.
 * Cells are completed when all their edges are claimed.
 */
export interface CellDef {
  id: string;
  type: CellType;
  edgeIds: string[];
  vertexIds: string[];
}

// ─── Board Metadata ─────────────────────────────────────

export interface BoardMetadata {
  description: string;
  recommendedPlayerCount: { min: number; max: number };
  difficulty: "easy" | "medium" | "hard";
}

// ─── Board Definition ───────────────────────────────────

/**
 * Complete board definition.
 * This is the topology data that both the game engine and renderer consume.
 * The engine uses only the graph structure (vertices, edges, cells).
 * The renderer uses coordinates (x, y) for visual layout.
 */
export interface BoardDefinition {
  id: string;
  name: string;
  cellType: CellType;
  symmetry: BoardSymmetry;
  vertices: VertexDef[];
  edges: EdgeDef[];
  cells: CellDef[];
  metadata: BoardMetadata;
}
