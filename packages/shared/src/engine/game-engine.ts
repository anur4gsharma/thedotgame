import type {
  BoardDefinition,
  GameState,
  Player,
  EdgeState,
  CellState,
  MoveRecord,
  MoveValidationResult,
  GameResult,
  SerializedGameState,
} from "../types/index.js";
import { PLAYER_COLORS } from "../types/index.js";
import { CHANCES_PER_TURN } from "../types/index.js";
import type { TimerMode } from "../types/board.js";

// ─── Board Runtime ──────────────────────────────────────

/**
 * Materialized board for fast runtime lookups.
 * Built once from BoardDefinition, used by the engine.
 */
export interface BoardRuntime {
  definition: BoardDefinition;
  edgeToCells: Map<string, string[]>;
}

/**
 * Build a runtime board from a board definition.
 * Pre-computes edge→cell adjacency for O(1) lookups during move processing.
 */
export function buildBoardRuntime(board: BoardDefinition): BoardRuntime {
  const edgeToCells = new Map<string, string[]>();

  for (const cell of board.cells) {
    for (const edgeId of cell.edgeIds) {
      const cells = edgeToCells.get(edgeId);
      if (cells) {
        cells.push(cell.id);
      } else {
        edgeToCells.set(edgeId, [cell.id]);
      }
    }
  }

  return { definition: board, edgeToCells };
}

// ─── Game Engine ────────────────────────────────────────

export class GameEngine {
  /**
   * Create a new game state from a board definition and list of players.
   */
  static createGame(board: BoardDefinition, players: Player[]): GameState {
    if (players.length < 2 || players.length > 4) throw new Error("A game requires 2 to 4 players");
    // Initialize all edges as unclaimed
    const edges = new Map<string, EdgeState>();
    for (const edge of board.edges) {
      edges.set(edge.id, { owner: null, claimedAt: null });
    }

    // Initialize all cells as unclaimed
    const cells = new Map<string, CellState>();
    for (const cell of board.cells) {
      cells.set(cell.id, { owner: null, completedAt: null });
    }

    // Initialize scores
    const scores = new Map<string, number>();
    for (const player of players) {
      scores.set(player.id, 0);
    }

    return {
      boardId: board.id,
      status: "playing",
      players,
      currentPlayerIndex: 0,
      // The opening player has the standard one move. A timeout grants the
      // incoming player the two-chance handoff bonus.
      chancesRemaining: 1,
      edges,
      cells,
      scores,
      moveHistory: [],
      sequenceNumber: 0,
      turnDeadline: null,
      timerMode: 0,
      timeoutCount: 0,
      startedAt: Date.now(),
      completedAt: null,
    };
  }

  /**
   * Validate a move without applying it.
   */
  static isValidMove(
    state: GameState,
    board: BoardDefinition,
    playerId: string,
    edgeId: string,
    expectedSequence?: number,
  ): MoveValidationResult {
    // Game must be in playing status
    if (state.status !== "playing") {
      return {
        valid: false,
        reason: state.status === "waiting" ? "game_not_started" : "game_already_over",
      };
    }

    // Player must be in the game
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return { valid: false, reason: "player_not_in_game" };
    }

    // Must be the player's turn
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { valid: false, reason: "not_your_turn" };
    }

    // Edge must exist on the board
    const edgeDef = board.edges.find((e) => e.id === edgeId);
    if (!edgeDef) {
      return { valid: false, reason: "edge_not_found" };
    }

    // Edge must be claimable
    if (!edgeDef.claimable) {
      return { valid: false, reason: "edge_not_claimable" };
    }

    // Edge must not already be claimed
    const edgeState = state.edges.get(edgeId);
    if (!edgeState) {
      return { valid: false, reason: "edge_not_found" };
    }
    if (edgeState.owner !== null) {
      return { valid: false, reason: "edge_already_claimed" };
    }

    // Sequence number validation (if provided)
    if (expectedSequence !== undefined && expectedSequence !== state.sequenceNumber) {
      return { valid: false, reason: "invalid_sequence" };
    }

    return { valid: true };
  }

  static startTimer(state: GameState, timerMode: TimerMode, now = Date.now()): GameState {
    return { ...state, timerMode, turnDeadline: timerMode === 0 ? null : now + timerMode * 1000 };
  }

  static expireTurn(state: GameState, now = Date.now()): GameState {
    if (state.status !== "playing" || state.turnDeadline === null || now < state.turnDeadline) return state;
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextDeadline = state.timerMode === 0 ? null : now + state.timerMode * 1000;
    return {
      ...state,
      currentPlayerIndex: nextPlayerIndex,
      chancesRemaining: CHANCES_PER_TURN,
      turnDeadline: nextDeadline,
      timeoutCount: state.timeoutCount + 1,
      sequenceNumber: state.sequenceNumber + 1,
    };
  }

  /**
   * Apply a validated move to the game state.
   * Returns a NEW state (immutable update).
   */
  static applyMove(
    state: GameState,
    board: BoardDefinition,
    boardRuntime: BoardRuntime,
    playerId: string,
    edgeId: string,
  ): GameState {
    const now = Date.now();

    // Clone state (immutable updates)
    const newEdges = new Map(state.edges);
    const newCells = new Map(state.cells);
    const newScores = new Map(state.scores);
    const newMoveHistory = [...state.moveHistory];

    // Claim the edge
    newEdges.set(edgeId, { owner: playerId, claimedAt: now });

    // Check all cells incident to this edge
    const incidentCellIds = boardRuntime.edgeToCells.get(edgeId) || [];
    const completedCells: string[] = [];

    for (const cellId of incidentCellIds) {
      const cellState = newCells.get(cellId);
      if (!cellState || cellState.owner !== null) continue; // Already completed

      const cellDef = board.cells.find((c) => c.id === cellId);
      if (!cellDef) continue;

      // Check if ALL edges of this cell are now claimed
      const allClaimed = cellDef.edgeIds.every((eid) => {
        const es = newEdges.get(eid);
        return es && es.owner !== null;
      });

      if (allClaimed) {
        // Cell is completed!
        newCells.set(cellId, { owner: playerId, completedAt: now });
        completedCells.push(cellId);

        // Award point
        const currentScore = newScores.get(playerId) || 0;
        newScores.set(playerId, currentScore + 1);
      }
    }

    // Record the move
    const moveRecord: MoveRecord = {
      playerId,
      edgeId,
      timestamp: now,
      completedCells,
      sequenceNumber: state.sequenceNumber,
    };
    newMoveHistory.push(moveRecord);

    // Check if game is over
    const allCellsCompleted = Array.from(newCells.values()).every(
      (c) => c.owner !== null,
    );
    const newStatus = allCellsCompleted ? "completed" : "playing";

    // A normal move hands the turn to the next player. A timeout is the only
    // way to grant the incoming player two chances; completing a cell still
    // preserves the classic extra-turn rule.
    const extraTurn = completedCells.length > 0;
    const bonusChance = state.chancesRemaining > 1 && !extraTurn;
    const nextPlayerIndex = extraTurn || bonusChance
      ? state.currentPlayerIndex
      : (state.currentPlayerIndex + 1) % state.players.length;
    const chancesRemaining = newStatus === "completed"
      ? 0
      : extraTurn
        ? state.chancesRemaining
        : bonusChance
          ? state.chancesRemaining - 1
          : 1;
    const playerChanged = nextPlayerIndex !== state.currentPlayerIndex;

    return {
      ...state,
      status: newStatus,
      currentPlayerIndex: nextPlayerIndex,
      chancesRemaining,
      edges: newEdges,
      cells: newCells,
      scores: newScores,
      moveHistory: newMoveHistory,
      sequenceNumber: state.sequenceNumber + 1,
      turnDeadline: newStatus === "completed" || state.timerMode === 0
        ? null
        : playerChanged
          ? now + state.timerMode * 1000
          : state.turnDeadline,
      completedAt: newStatus === "completed" ? now : null,
    };
  }

  /**
   * Get the game result (sorted by score, descending).
   */
  static getGameResult(state: GameState): GameResult[] {
    if (state.status !== "completed") return [];

    // Sort players by score (descending), then by join time (ascending) for ties
    const sorted = [...state.players].sort((a, b) => {
      const scoreA = state.scores.get(a.id) || 0;
      const scoreB = state.scores.get(b.id) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.joinedAt - b.joinedAt;
    });

    return sorted.map((player, index) => ({
      playerId: player.id,
      playerName: player.name,
      color: player.color,
      score: state.scores.get(player.id) || 0,
      rank: index === 0 || (state.scores.get(player.id) || 0) !== (state.scores.get(sorted[index - 1].id) || 0) ? index + 1 : index,
    }));
  }

  /**
   * Serialize game state for network transmission.
   */
  static serialize(state: GameState): SerializedGameState {
    const edges: Record<string, EdgeState> = {};
    for (const [id, edgeState] of state.edges) {
      edges[id] = edgeState;
    }

    const cells: Record<string, CellState> = {};
    for (const [id, cellState] of state.cells) {
      cells[id] = cellState;
    }

    const scores: Record<string, number> = {};
    for (const [id, score] of state.scores) {
      scores[id] = score;
    }

    return {
      boardId: state.boardId,
      status: state.status,
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      chancesRemaining: state.chancesRemaining,
      edges,
      cells,
      scores,
      moveHistory: state.moveHistory,
      sequenceNumber: state.sequenceNumber,
      turnDeadline: state.turnDeadline,
      serverNow: Date.now(),
      timerMode: state.timerMode,
      timeoutCount: state.timeoutCount,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
    };
  }

  /**
   * Deserialize game state from network transmission.
   */
  static deserialize(data: SerializedGameState): GameState {
    const edges = new Map<string, EdgeState>();
    for (const [id, edgeState] of Object.entries(data.edges)) {
      edges.set(id, edgeState);
    }

    const cells = new Map<string, CellState>();
    for (const [id, cellState] of Object.entries(data.cells)) {
      cells.set(id, cellState);
    }

    const scores = new Map<string, number>();
    for (const [id, score] of Object.entries(data.scores)) {
      scores.set(id, score);
    }

    return {
      boardId: data.boardId,
      status: data.status,
      players: data.players,
      currentPlayerIndex: data.currentPlayerIndex,
      chancesRemaining: data.chancesRemaining ?? CHANCES_PER_TURN,
      edges,
      cells,
      scores,
      moveHistory: data.moveHistory,
      sequenceNumber: data.sequenceNumber,
      turnDeadline: data.turnDeadline ?? null,
      timerMode: data.timerMode ?? 0,
      timeoutCount: data.timeoutCount ?? 0,
      startedAt: data.startedAt ?? Date.now(),
      completedAt: data.completedAt ?? null,
    };
  }

  /**
   * Create a player with an assigned color.
   */
  static createPlayer(
    id: string,
    name: string,
    playerIndex: number,
  ): Player {
    return {
      id,
      name,
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      connected: true,
      joinedAt: Date.now(),
    };
  }
}
