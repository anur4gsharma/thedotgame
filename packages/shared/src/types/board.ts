// ─── Cell Types ─────────────────────────────────────────

export type CellType = "square" | "triangle";
export type BoardShape = "square" | "triangle" | "hexagon" | "octagon";

export type BoardPreset =
  | "classic" | "minimal" | "neon" | "blueprint" | "paper"
  | "monochrome" | "arcade" | "soft" | "midnight";

export interface BoardVisualConfig {
  preset: BoardPreset;
  dotSpacing: number;
  dotSize: number;
  lineThickness: number;
  padding: number;
  playerColors: [string, string, string, string];
  backgroundColor: string;
  dotColor: string;
  lineColor: string;
  completedCellColors: [string, string, string, string];
  hoverColor: string;
  turnColor: string;
}

export interface BoardConfig {
  shape?: BoardShape;
  width: number;
  height: number;
  visual: BoardVisualConfig;
}

export const TIMER_MODES = [0, 15, 30, 45, 60, 90, 120] as const;
export type TimerMode = (typeof TIMER_MODES)[number];

export const DEFAULT_BOARD_VISUAL: BoardVisualConfig = {
  preset: "classic", dotSpacing: 1, dotSize: 1, lineThickness: 1, padding: 0.16,
  playerColors: ["#2957A4", "#D94B3D", "#2E8B57", "#D97706"],
  backgroundColor: "#F3F0E8", dotColor: "#161616", lineColor: "#D6D1C5",
  completedCellColors: ["#D7E2F7", "#F6D9D5", "#D9EBDD", "#F8E7C7"],
  hoverColor: "#161616", turnColor: "#161616",
};

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
  config?: BoardConfig;
}
