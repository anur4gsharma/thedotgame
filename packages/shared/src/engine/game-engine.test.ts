import { describe, it, expect, beforeEach } from "vitest";
import { GameEngine, buildBoardRuntime, BoardRuntime } from "./game-engine.js";
import { generateSquareBoard } from "../shapes/square.js";
import { generateTriangleBoard } from "../shapes/triangle.js";
import type { BoardDefinition, GameState, Player } from "../types/index.js";

// ─── Test Helpers ───────────────────────────────────────

function createTestPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) =>
    GameEngine.createPlayer(`player-${i + 1}`, `Player ${i + 1}`, i),
  );
}

function makeMove(
  state: GameState,
  board: BoardDefinition,
  runtime: BoardRuntime,
  playerId: string,
  edgeId: string,
): GameState {
  const validation = GameEngine.isValidMove(state, board, playerId, edgeId);
  if (!validation.valid) {
    throw new Error(`Invalid move: ${validation.reason}`);
  }
  return GameEngine.applyMove(state, board, runtime, playerId, edgeId);
}

// ─── Square Cell Tests ──────────────────────────────────

describe("GameEngine - Square Cells", () => {
  let board: BoardDefinition;
  let runtime: BoardRuntime;
  let players: Player[];

  beforeEach(() => {
    board = generateSquareBoard(3, 3); // 3x3 = 9 cells
    runtime = buildBoardRuntime(board);
    players = createTestPlayers(2);
  });

  it("should create a valid initial game state", () => {
    const state = GameEngine.createGame(board, players);

    expect(state.status).toBe("playing");
    expect(state.players).toHaveLength(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.scores.get("player-1")).toBe(0);
    expect(state.scores.get("player-2")).toBe(0);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.sequenceNumber).toBe(0);

    // All edges should be unclaimed
    for (const edge of board.edges) {
      const edgeState = state.edges.get(edge.id);
      expect(edgeState).toBeDefined();
      expect(edgeState!.owner).toBeNull();
    }

    // All cells should be unclaimed
    for (const cell of board.cells) {
      const cellState = state.cells.get(cell.id);
      expect(cellState).toBeDefined();
      expect(cellState!.owner).toBeNull();
    }
  });

  it("should accept a valid horizontal edge move", () => {
    const state = GameEngine.createGame(board, players);
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "h-0-0",
    );

    expect(validation.valid).toBe(true);
  });

  it("should accept a valid vertical edge move", () => {
    const state = GameEngine.createGame(board, players);
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "v-0-0",
    );

    expect(validation.valid).toBe(true);
  });

  it("should reject a duplicate edge move", () => {
    let state = GameEngine.createGame(board, players);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");

    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-2",
      "h-0-0",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("edge_already_claimed");
    }
  });

  it("should reject an invalid edge ID", () => {
    const state = GameEngine.createGame(board, players);
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "nonexistent-edge",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("edge_not_found");
    }
  });

  it("should reject a move on the wrong turn", () => {
    const state = GameEngine.createGame(board, players);
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-2",
      "h-0-0",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("not_your_turn");
    }
  });

  it("should reject a move when game is not started", () => {
    const state = GameEngine.createGame(board, players);
    state.status = "waiting";
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "h-0-0",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("game_not_started");
    }
  });

  it("should reject a move when game is already over", () => {
    const state = GameEngine.createGame(board, players);
    state.status = "completed";
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "h-0-0",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("game_already_over");
    }
  });

  it("should not complete a cell with only one edge", () => {
    let state = GameEngine.createGame(board, players);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");

    // Cell c-0-0 has edges: h-0-0, v-0-0, h-0-1, v-1-0
    // Only h-0-0 is claimed, so cell should not be complete
    const cellState = state.cells.get("c-0-0");
    expect(cellState!.owner).toBeNull();
    expect(state.scores.get("player-1")).toBe(0);
  });

  it("should complete a cell when all 4 edges are claimed", () => {
    let state = GameEngine.createGame(board, players);

    // Claim 3 edges with player-1 (no completion)
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-1-0");

    // Now player-1 claims the 4th edge of cell c-0-0
    state = makeMove(state, board, runtime, "player-1", "h-0-1");

    // Cell c-0-0 should be completed by player-1
    const cellState = state.cells.get("c-0-0");
    expect(cellState!.owner).toBe("player-1");
    expect(state.scores.get("player-1")).toBe(1);
  });

  it("should grant an extra turn when a cell is completed", () => {
    let state = GameEngine.createGame(board, players);

    // Set up: claim 3 edges of cell c-0-0
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-1-0");

    // Player-1 claims the 4th edge (completes cell)
    state = makeMove(state, board, runtime, "player-1", "h-0-1");

    // It should still be player-1's turn
    expect(state.currentPlayerIndex).toBe(0); // player-1
  });

  it("should advance turn when no cell is completed", () => {
    let state = GameEngine.createGame(board, players);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");

    // No cell completed, turn should advance
    expect(state.currentPlayerIndex).toBe(1); // player-2
  });

  it("should complete two adjacent cells in one move", () => {
    let state = GameEngine.createGame(board, players);

    // Set up: claim edges so that one move completes two cells
    // Cell c-0-0: h-0-0, v-0-0, h-0-1, v-1-0
    // Cell c-1-0: h-1-0, v-1-0, h-1-1, v-2-0
    // Shared edge: v-1-0

    // Claim edges for both cells (except v-1-0 which is shared)
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-2-0");
    state = makeMove(state, board, runtime, "player-1", "h-0-1");
    state = makeMove(state, board, runtime, "player-2", "h-1-1");

    // Now claim the shared edge v-1-0 - this should complete BOTH cells
    state = makeMove(state, board, runtime, "player-1", "v-1-0");

    // Both cells should be completed by player-1
    expect(state.cells.get("c-0-0")!.owner).toBe("player-1");
    expect(state.cells.get("c-1-0")!.owner).toBe("player-1");
    expect(state.scores.get("player-1")).toBe(2);
  });

  it("should update score correctly", () => {
    let state = GameEngine.createGame(board, players);

    // Complete cell c-0-0
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-1-0");
    state = makeMove(state, board, runtime, "player-1", "h-0-1");

    expect(state.scores.get("player-1")).toBe(1);
    expect(state.scores.get("player-2")).toBe(0);
  });

  it("should end the game when all cells are claimed", () => {
    let state = GameEngine.createGame(board, players);

    // For a 3x3 board, there are 18 edges and 9 cells
    // Play through all edges (simplified - just test the end condition)
    const allEdges = board.edges.map((e) => e.id);

    for (let i = 0; i < allEdges.length; i++) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const edgeId = allEdges[i];

      // Skip if edge already claimed
      if (state.edges.get(edgeId)?.owner !== null) continue;

      const validation = GameEngine.isValidMove(
        state,
        board,
        currentPlayer.id,
        edgeId,
      );
      if (!validation.valid) continue;

      state = GameEngine.applyMove(state, board, runtime, currentPlayer.id, edgeId);

      if (state.status === "completed") break;
    }

    // Game should be completed
    expect(state.status).toBe("completed");
  });

  it("should get correct game results", () => {
    let state = GameEngine.createGame(board, players);

    // Complete a few cells
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-1-0");
    state = makeMove(state, board, runtime, "player-1", "h-0-1");

    // Manually end the game for testing
    state.status = "completed";

    const results = GameEngine.getGameResult(state);
    expect(results).toHaveLength(2);
    expect(results[0].playerId).toBe("player-1");
    expect(results[0].score).toBe(1);
    expect(results[0].rank).toBe(1);
    expect(results[1].playerId).toBe("player-2");
    expect(results[1].score).toBe(0);
    expect(results[1].rank).toBe(2);
  });

  it("should serialize and deserialize correctly", () => {
    let state = GameEngine.createGame(board, players);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");

    const serialized = GameEngine.serialize(state);
    const deserialized = GameEngine.deserialize(serialized);

    expect(deserialized.status).toBe(state.status);
    expect(deserialized.currentPlayerIndex).toBe(state.currentPlayerIndex);
    expect(deserialized.sequenceNumber).toBe(state.sequenceNumber);
    expect(deserialized.edges.get("h-0-0")?.owner).toBe("player-1");
    expect(deserialized.edges.get("h-1-0")?.owner).toBeNull();
  });

  it("should track move history", () => {
    let state = GameEngine.createGame(board, players);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-0-0");

    expect(state.moveHistory).toHaveLength(2);
    expect(state.moveHistory[0].playerId).toBe("player-1");
    expect(state.moveHistory[0].edgeId).toBe("h-0-0");
    expect(state.moveHistory[1].playerId).toBe("player-2");
    expect(state.moveHistory[1].edgeId).toBe("v-0-0");
  });

  it("should increment sequence number with each move", () => {
    let state = GameEngine.createGame(board, players);
    expect(state.sequenceNumber).toBe(0);

    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    expect(state.sequenceNumber).toBe(1);

    state = makeMove(state, board, runtime, "player-2", "v-0-0");
    expect(state.sequenceNumber).toBe(2);
  });
});

// ─── Triangular Cell Tests ──────────────────────────────

describe("GameEngine - Triangular Cells", () => {
  let board: BoardDefinition;
  let runtime: BoardRuntime;
  let players: Player[];

  beforeEach(() => {
    board = generateTriangleBoard(3); // 3² = 9 triangular cells
    runtime = buildBoardRuntime(board);
    players = createTestPlayers(2);
  });

  it("should create a valid triangular game state", () => {
    const state = GameEngine.createGame(board, players);

    expect(state.status).toBe("playing");
    expect(state.players).toHaveLength(2);

    // Verify we have triangular cells
    const triangleCells = board.cells.filter((c) => c.type === "triangle");
    expect(triangleCells.length).toBeGreaterThan(0);
  });

  it("should accept a valid triangular cell edge move", () => {
    const state = GameEngine.createGame(board, players);

    // Find a claimable edge
    const claimableEdge = board.edges.find((e) => e.claimable);
    expect(claimableEdge).toBeDefined();

    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      claimableEdge!.id,
    );
    expect(validation.valid).toBe(true);
  });

  it("should complete a triangular cell when all 3 edges are claimed", () => {
    let state = GameEngine.createGame(board, players);

    // Find a cell with exactly 3 edges
    const triangleCell = board.cells.find(
      (c) => c.type === "triangle" && c.edgeIds.length === 3,
    );
    expect(triangleCell).toBeDefined();

    // Claim the first 2 edges (no completion)
    state = makeMove(
      state,
      board,
      runtime,
      "player-1",
      triangleCell!.edgeIds[0],
    );
    state = makeMove(
      state,
      board,
      runtime,
      "player-2",
      triangleCell!.edgeIds[1],
    );

    // Cell should not be complete yet
    expect(state.cells.get(triangleCell!.id)!.owner).toBeNull();

    // Claim the 3rd edge - should complete the cell
    state = makeMove(
      state,
      board,
      runtime,
      "player-1",
      triangleCell!.edgeIds[2],
    );

    expect(state.cells.get(triangleCell!.id)!.owner).toBe("player-1");
    expect(state.scores.get("player-1")).toBe(1);
  });

  it("should handle shared edges between triangles", () => {
    // Find two adjacent triangles that share an edge
    const cells = board.cells.filter((c) => c.type === "triangle");
    let sharedEdge: string | null = null;
    let cell1: typeof cells[0] | null = null;
    let cell2: typeof cells[0] | null = null;

    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const common = cells[i].edgeIds.filter((e) =>
          cells[j].edgeIds.includes(e),
        );
        if (common.length > 0) {
          sharedEdge = common[0];
          cell1 = cells[i];
          cell2 = cells[j];
          break;
        }
      }
      if (sharedEdge) break;
    }

    expect(sharedEdge).not.toBeNull();
    expect(cell1).not.toBeNull();
    expect(cell2).not.toBeNull();

    // Claim all edges of cell1 except the shared edge
    let state = GameEngine.createGame(board, players);
    const otherEdges1 = cell1!.edgeIds.filter((e) => e !== sharedEdge);

    for (let i = 0; i < otherEdges1.length; i++) {
      const player = state.players[state.currentPlayerIndex];
      state = makeMove(state, board, runtime, player.id, otherEdges1[i]);
    }

    // Claim all edges of cell2 except the shared edge
    const otherEdges2 = cell2!.edgeIds.filter((e) => e !== sharedEdge);
    for (let i = 0; i < otherEdges2.length; i++) {
      const player = state.players[state.currentPlayerIndex];
      state = makeMove(state, board, runtime, player.id, otherEdges2[i]);
    }

    // Now claim the shared edge - should complete BOTH cells
    const player = state.players[state.currentPlayerIndex];
    state = makeMove(state, board, runtime, player.id, sharedEdge!);

    // Both cells should be completed
    expect(state.cells.get(cell1!.id)!.owner).not.toBeNull();
    expect(state.cells.get(cell2!.id)!.owner).not.toBeNull();
  });

  it("should reject an invalid topology reference", () => {
    const state = GameEngine.createGame(board, players);
    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-1",
      "nonexistent-edge",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("edge_not_found");
    }
  });

  it("should reject a duplicate triangular boundary", () => {
    let state = GameEngine.createGame(board, players);
    const claimableEdge = board.edges.find((e) => e.claimable)!;

    state = makeMove(state, board, runtime, "player-1", claimableEdge.id);

    const validation = GameEngine.isValidMove(
      state,
      board,
      "player-2",
      claimableEdge.id,
    );
    expect(validation.valid).toBe(false);
  });
});

// ─── General Geometry Tests ─────────────────────────────

describe("GameEngine - General Geometry", () => {
  it("should work with an arbitrary valid edge", () => {
    const board = generateSquareBoard(2, 2);
    const runtime = buildBoardRuntime(board);
    const players = createTestPlayers(2);
    let state = GameEngine.createGame(board, players);

    // Pick any edge
    const edge = board.edges[5];
    state = makeMove(state, board, runtime, "player-1", edge.id);

    expect(state.edges.get(edge.id)?.owner).toBe("player-1");
  });

  it("should handle cells with different numbers of boundaries", () => {
    // Square cells have 4 edges, triangular cells have 3
    // This is tested implicitly by the square and triangle tests above
    // But let's verify the engine handles the edge count correctly

    const squareBoard = generateSquareBoard(2, 2);
    const triangleBoard = generateTriangleBoard(2);

    // Verify cell types
    for (const cell of squareBoard.cells) {
      expect(cell.edgeIds.length).toBe(4);
    }
    for (const cell of triangleBoard.cells) {
      expect(cell.edgeIds.length).toBe(3);
    }
  });

  it("should handle a single-cell board", () => {
    // Create a minimal board with 1 cell
    const board: BoardDefinition = {
      id: "minimal",
      name: "Minimal Board",
      cellType: "square",
      symmetry: "rectangular",
      vertices: [
        { id: "v0", x: 0, y: 0 },
        { id: "v1", x: 1, y: 0 },
        { id: "v2", x: 1, y: 1 },
        { id: "v3", x: 0, y: 1 },
      ],
      edges: [
        { id: "e0", vertexA: "v0", vertexB: "v1", claimable: true },
        { id: "e1", vertexA: "v1", vertexB: "v2", claimable: true },
        { id: "e2", vertexA: "v2", vertexB: "v3", claimable: true },
        { id: "e3", vertexA: "v3", vertexB: "v0", claimable: true },
      ],
      cells: [
        {
          id: "c0",
          type: "square",
          edgeIds: ["e0", "e1", "e2", "e3"],
          vertexIds: ["v0", "v1", "v2", "v3"],
        },
      ],
      metadata: {
        description: "Minimal single-cell board",
        recommendedPlayerCount: { min: 2, max: 2 },
        difficulty: "easy",
      },
    };

    const runtime = buildBoardRuntime(board);
    const players = createTestPlayers(2);
    let state = GameEngine.createGame(board, players);

    // Claim all 4 edges
    state = makeMove(state, board, runtime, "player-1", "e0");
    state = makeMove(state, board, runtime, "player-2", "e1");
    state = makeMove(state, board, runtime, "player-1", "e2");
    state = makeMove(state, board, runtime, "player-2", "e3");

    // Game should be completed
    expect(state.status).toBe("completed");
    expect(state.cells.get("c0")!.owner).toBe("player-2");
    expect(state.scores.get("player-2")).toBe(1);
  });

  it("should handle outer boundary edges correctly", () => {
    const board = generateSquareBoard(2, 2);
    const players = createTestPlayers(2);
    const state = GameEngine.createGame(board, players);

    // All edges should be claimable by default
    for (const edge of board.edges) {
      const edgeState = state.edges.get(edge.id);
      expect(edgeState).toBeDefined();
    }
  });

  it("should reject moves for non-existent players", () => {
    const board = generateSquareBoard(2, 2);
    const players = createTestPlayers(2);
    const state = GameEngine.createGame(board, players);

    const validation = GameEngine.isValidMove(
      state,
      board,
      "nonexistent-player",
      "h-0-0",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.reason).toBe("player_not_in_game");
    }
  });
});

// ─── Multiplayer Tests ──────────────────────────────────

describe("GameEngine - Multiplayer", () => {
  it("should support 2 players", () => {
    const board = generateSquareBoard(2, 2);
    const players = createTestPlayers(2);
    const state = GameEngine.createGame(board, players);

    expect(state.players).toHaveLength(2);
  });

  it("should support 3 players", () => {
    const board = generateSquareBoard(3, 3);
    const players = createTestPlayers(3);
    const state = GameEngine.createGame(board, players);

    expect(state.players).toHaveLength(3);
  });

  it("should support 4 players", () => {
    const board = generateSquareBoard(4, 4);
    const players = createTestPlayers(4);
    const state = GameEngine.createGame(board, players);

    expect(state.players).toHaveLength(4);
  });

  it("should cycle through players correctly", () => {
    const board = generateSquareBoard(3, 3);
    const runtime = buildBoardRuntime(board);
    const players = createTestPlayers(3);
    let state = GameEngine.createGame(board, players);

    // Player 1's turn
    expect(state.currentPlayerIndex).toBe(0);
    state = makeMove(state, board, runtime, "player-1", "h-0-0");

    // Player 2's turn
    expect(state.currentPlayerIndex).toBe(1);
    state = makeMove(state, board, runtime, "player-2", "h-1-0");

    // Player 3's turn
    expect(state.currentPlayerIndex).toBe(2);
    state = makeMove(state, board, runtime, "player-3", "h-2-0");

    // Back to Player 1
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("should keep same player on extra turn", () => {
    const board = generateSquareBoard(3, 3);
    const runtime = buildBoardRuntime(board);
    const players = createTestPlayers(2);
    let state = GameEngine.createGame(board, players);

    // Set up cell completion
    state = makeMove(state, board, runtime, "player-1", "h-0-0");
    state = makeMove(state, board, runtime, "player-2", "h-1-0");
    state = makeMove(state, board, runtime, "player-1", "v-0-0");
    state = makeMove(state, board, runtime, "player-2", "v-1-0");

    // Player 1 completes cell
    state = makeMove(state, board, runtime, "player-1", "h-0-1");

    // Should still be player 1's turn
    expect(state.currentPlayerIndex).toBe(0);
  });
});

// ─── Board Runtime Tests ────────────────────────────────

describe("BoardRuntime", () => {
  it("should build correct edge-to-cell mapping", () => {
    const board = generateSquareBoard(2, 2);
    const runtime = buildBoardRuntime(board);

    // Edge h-0-0 should belong to cell c-0-0
    const cellsForEdge = runtime.edgeToCells.get("h-0-0");
    expect(cellsForEdge).toBeDefined();
    expect(cellsForEdge).toContain("c-0-0");
  });

  it("should handle shared edges", () => {
    const board = generateSquareBoard(2, 2);
    const runtime = buildBoardRuntime(board);

    // Edge v-1-0 should be shared by cells c-0-0 and c-1-0
    const cellsForEdge = runtime.edgeToCells.get("v-1-0");
    expect(cellsForEdge).toBeDefined();
    expect(cellsForEdge!.length).toBe(2);
    expect(cellsForEdge).toContain("c-0-0");
    expect(cellsForEdge).toContain("c-1-0");
  });

  it("should handle triangular cells", () => {
    const board = generateTriangleBoard(2);
    const runtime = buildBoardRuntime(board);

    // Every edge should be mapped to at least one cell
    for (const edge of board.edges) {
      const cells = runtime.edgeToCells.get(edge.id);
      expect(cells).toBeDefined();
      expect(cells!.length).toBeGreaterThan(0);
    }
  });
});
