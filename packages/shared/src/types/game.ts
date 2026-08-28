// ─── Player Colors ──────────────────────────────────────

export type PlayerColor = "blue" | "red" | "green" | "orange";

export const PLAYER_COLORS: PlayerColor[] = ["blue", "red", "green", "orange"];

// ─── Player ─────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
  joinedAt: number;
}

// ─── Game Status ────────────────────────────────────────

export type GameStatus = "waiting" | "playing" | "completed";

// ─── Edge State ─────────────────────────────────────────

export interface EdgeState {
  owner: string | null;
  claimedAt: number | null;
}

// ─── Cell State ─────────────────────────────────────────

export interface CellState {
  owner: string | null;
  completedAt: number | null;
}

// ─── Move Record ────────────────────────────────────────

export interface MoveRecord {
  playerId: string;
  edgeId: string;
  timestamp: number;
  completedCells: string[];
  sequenceNumber: number;
}

// ─── Game State ─────────────────────────────────────────

/**
 * Complete game state.
 * This is the authoritative state that the server maintains.
 */
export interface GameState {
  boardId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  edges: Map<string, EdgeState>;
  cells: Map<string, CellState>;
  scores: Map<string, number>;
  moveHistory: MoveRecord[];
  sequenceNumber: number;
}

// ─── Serialized State ───────────────────────────────────

/**
 * Serialized game state for network transmission.
 * Maps are converted to objects for JSON serialization.
 */
export interface SerializedGameState {
  boardId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  edges: Record<string, EdgeState>;
  cells: Record<string, CellState>;
  scores: Record<string, number>;
  moveHistory: MoveRecord[];
  sequenceNumber: number;
}

// ─── Game Result ────────────────────────────────────────

export interface GameResult {
  playerId: string;
  playerName: string;
  color: PlayerColor;
  score: number;
  rank: number;
}

// ─── Move Validation ────────────────────────────────────

export type MoveValidationResult =
  | { valid: true }
  | { valid: false; reason: MoveRejectionReason };

export type MoveRejectionReason =
  | "game_not_started"
  | "game_already_over"
  | "not_your_turn"
  | "edge_not_found"
  | "edge_not_claimable"
  | "edge_already_claimed"
  | "player_not_in_game"
  | "invalid_sequence";
