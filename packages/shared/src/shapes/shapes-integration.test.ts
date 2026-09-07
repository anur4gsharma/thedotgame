import { describe, expect, it } from "vitest";
import { GameEngine, buildBoardRuntime } from "../engine/game-engine.js";
import { generateBoardFromConfig } from "./board-factory.js";
import { DEFAULT_BOARD_VISUAL } from "../types/board.js";
import type { BoardShape } from "../types/board.js";

describe("multi-topology game engine integration", () => {
  const topologies: BoardShape[] = ["square", "triangle", "hexagon", "octagon"];
  const players = [
    GameEngine.createPlayer("p1", "Player One", 0),
    GameEngine.createPlayer("p2", "Player Two", 1),
  ];

  for (const shape of topologies) {
    describe(`Topology: ${shape}`, () => {
      const board = generateBoardFromConfig({
        shape,
        width: 4,
        height: 4,
        visual: DEFAULT_BOARD_VISUAL,
      });
      const runtime = buildBoardRuntime(board);

      it(`generates valid structure for ${shape}`, () => {
        expect(board.vertices.length).toBeGreaterThan(0);
        expect(board.edges.length).toBeGreaterThan(0);
        expect(board.cells.length).toBeGreaterThan(0);

        // Every edge must have valid vertices
        const vertexIds = new Set(board.vertices.map((v) => v.id));
        for (const edge of board.edges) {
          expect(vertexIds.has(edge.vertexA)).toBe(true);
          expect(vertexIds.has(edge.vertexB)).toBe(true);
        }

        // Every cell must have valid vertices
        for (const cell of board.cells) {
          for (const vid of cell.vertexIds) {
            expect(vertexIds.has(vid)).toBe(true);
          }
        }
      });

      it(`initializes and plays moves on ${shape} board`, () => {
        let state = GameEngine.createGame(board, players);
        expect(state.status).toBe("playing");
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.sequenceNumber).toBe(0);

        const claimableEdges = board.edges.filter((e) => e.claimable);
        expect(claimableEdges.length).toBeGreaterThan(0);

        // First move by player 1
        const edge1 = claimableEdges[0].id;
        const valid1 = GameEngine.isValidMove(state, board, "p1", edge1, state.sequenceNumber);
        expect(valid1.valid).toBe(true);

        state = GameEngine.applyMove(state, board, runtime, "p1", edge1);
        expect(state.sequenceNumber).toBe(1);
        expect(state.edges.get(edge1)?.owner).toBe("p1");

        // Edge already claimed cannot be claimed again
        expect(GameEngine.isValidMove(state, board, "p2", edge1, state.sequenceNumber)).toEqual({
          valid: false,
          reason: "edge_already_claimed",
        });

        // Non-turn player cannot make move
        if (state.currentPlayerIndex === 1 && claimableEdges.length > 1) {
          const edge2 = claimableEdges[1].id;
          expect(GameEngine.isValidMove(state, board, "p1", edge2, state.sequenceNumber)).toEqual({
            valid: false,
            reason: "not_your_turn",
          });
        }
      });

      it(`serializes and deserializes game state for ${shape}`, () => {
        let state = GameEngine.createGame(board, players);
        const firstEdge = board.edges.find((e) => e.claimable)!.id;
        state = GameEngine.applyMove(state, board, runtime, "p1", firstEdge);

        const serialized = GameEngine.serialize(state);
        const restored = GameEngine.deserialize(serialized);

        expect(restored.status).toBe(state.status);
        expect(restored.sequenceNumber).toBe(state.sequenceNumber);
        expect(restored.currentPlayerIndex).toBe(state.currentPlayerIndex);
        expect(restored.edges.get(firstEdge)?.owner).toBe("p1");
        expect(restored.moveHistory).toHaveLength(1);
      });
    });
  }

  it("completes a cell on a triangular board and awards point + extra turn", () => {
    const board = generateBoardFromConfig({
      shape: "triangle",
      width: 2,
      height: 2,
      visual: DEFAULT_BOARD_VISUAL,
    });
    const runtime = buildBoardRuntime(board);
    let state = GameEngine.createGame(board, players);

    // Target the first cell (which has 3 edges)
    const targetCell = board.cells[0];
    const cellEdges = board.edges.filter((edge) => {
      const vA = edge.vertexA;
      const vB = edge.vertexB;
      return targetCell.vertexIds.includes(vA) && targetCell.vertexIds.includes(vB);
    });
    expect(cellEdges).toHaveLength(3);

    // Play 2 edges without completing
    state = GameEngine.applyMove(state, board, runtime, "p1", cellEdges[0].id);
    const p2Id = state.players[state.currentPlayerIndex].id;
    state = GameEngine.applyMove(state, board, runtime, p2Id, cellEdges[1].id);

    // 3rd edge completes the triangle
    const scoringPlayerId = state.players[state.currentPlayerIndex].id;
    state = GameEngine.applyMove(state, board, runtime, scoringPlayerId, cellEdges[2].id);

    expect(state.cells.get(targetCell.id)?.owner).toBe(scoringPlayerId);
    expect(state.scores.get(scoringPlayerId)).toBeGreaterThanOrEqual(1);

    // Scorer gets extra turn if game not over
    if (state.status === "playing") {
      expect(state.players[state.currentPlayerIndex].id).toBe(scoringPlayerId);
    }
  });
});
