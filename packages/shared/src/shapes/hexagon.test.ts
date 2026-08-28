import { describe, it, expect } from 'vitest';
import { generateHexagonBoard } from './hexagon.js';
import { GameEngine, buildBoardRuntime } from '../engine/index.js';
import type { Player } from '../types/index.js';

describe('Hexagon Board Generator', () => {
  it('should generate a size 2 board with correct counts', () => {
    const board = generateHexagonBoard(2);
    expect(board.vertices).toHaveLength(19);
    expect(board.cells).toHaveLength(24);
  });

  it('should generate a size 3 board with correct counts', () => {
    const board = generateHexagonBoard(3);
    expect(board.vertices).toHaveLength(37);
    expect(board.cells).toHaveLength(54);
  });

  it('should have triangle cell type', () => {
    const board = generateHexagonBoard(2);
    expect(board.cellType).toBe('triangle');
  });

  it('should have radial symmetry', () => {
    const board = generateHexagonBoard(2);
    expect(board.symmetry).toBe('radial');
  });

  it('should have all edges claimable', () => {
    const board = generateHexagonBoard(2);
    for (const edge of board.edges) {
      expect(edge.claimable).toBe(true);
    }
  });

  it('should have exactly 3 edges per cell', () => {
    const board = generateHexagonBoard(2);
    for (const cell of board.cells) {
      expect(cell.edgeIds).toHaveLength(3);
    }
  });

  it('should have unique vertex IDs', () => {
    const board = generateHexagonBoard(2);
    const ids = board.vertices.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique edge IDs', () => {
    const board = generateHexagonBoard(2);
    const ids = board.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique cell IDs', () => {
    const board = generateHexagonBoard(2);
    const ids = board.cells.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have valid vertex references in edges', () => {
    const board = generateHexagonBoard(2);
    const vertexIds = new Set(board.vertices.map((v) => v.id));
    for (const edge of board.edges) {
      expect(vertexIds.has(edge.vertexA)).toBe(true);
      expect(vertexIds.has(edge.vertexB)).toBe(true);
    }
  });

  it('should have valid edge references in cells', () => {
    const board = generateHexagonBoard(2);
    const edgeIds = new Set(board.edges.map((e) => e.id));
    for (const cell of board.cells) {
      for (const edgeId of cell.edgeIds) {
        expect(edgeIds.has(edgeId)).toBe(true);
      }
    }
  });

  it('should have valid vertex references in cells', () => {
    const board = generateHexagonBoard(2);
    const vertexIds = new Set(board.vertices.map((v) => v.id));
    for (const cell of board.cells) {
      for (const vertexId of cell.vertexIds) {
        expect(vertexIds.has(vertexId)).toBe(true);
      }
    }
  });

  it('should have normalized coordinates between 0 and 1', () => {
    const board = generateHexagonBoard(2);
    for (const vertex of board.vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0);
      expect(vertex.x).toBeLessThanOrEqual(1);
      expect(vertex.y).toBeGreaterThanOrEqual(0);
      expect(vertex.y).toBeLessThanOrEqual(1);
    }
  });

  describe('Topology integrity', () => {
    it('edge-vertex incidence: every edge must connect two vertices from that cell', () => {
      const board = generateHexagonBoard(2);
      const edgeMap = new Map(board.edges.map(e => [e.id, e]));
      for (const cell of board.cells) {
        for (const edgeId of cell.edgeIds) {
          const edge = edgeMap.get(edgeId)!;
          expect(cell.vertexIds).toContain(edge.vertexA);
          expect(cell.vertexIds).toContain(edge.vertexB);
        }
      }
    });

    it('closed triangle check: edges must form a closed cycle visiting all 3 vertices', () => {
      const board = generateHexagonBoard(2);
      const edgeMap = new Map(board.edges.map(e => [e.id, e]));
      for (const cell of board.cells) {
        const edges = cell.edgeIds.map(id => edgeMap.get(id)!);
        const edgeVertices = new Set<string>();
        edges.forEach(e => {
          edgeVertices.add(e.vertexA);
          edgeVertices.add(e.vertexB);
        });
        expect(edgeVertices.size).toBe(3);
        expect(new Set(cell.vertexIds)).toEqual(edgeVertices);
      }
    });

    it('every claimable edge belongs to at least one cell', () => {
      const board = generateHexagonBoard(2);
      const edgesInCells = new Set<string>();
      for (const cell of board.cells) {
        for (const edgeId of cell.edgeIds) {
          edgesInCells.add(edgeId);
        }
      }
      for (const edge of board.edges) {
        if (edge.claimable) {
          expect(edgesInCells.has(edge.id)).toBe(true);
        }
      }
    });

    it('should have no duplicate edges', () => {
      const board = generateHexagonBoard(2);
      const edgePairs = new Set<string>();
      for (const edge of board.edges) {
        const pair = [edge.vertexA, edge.vertexB].sort().join(',');
        expect(edgePairs.has(pair)).toBe(false);
        edgePairs.add(pair);
      }
    });
  });

  describe('Game simulation', () => {
    it('full game simulation completes successfully', () => {
      const board = generateHexagonBoard(2);
      const runtime = buildBoardRuntime(board);
      const players: Player[] = [
        GameEngine.createPlayer('p1', 'Player 1', 0),
        GameEngine.createPlayer('p2', 'Player 2', 1),
      ];
      let state = GameEngine.createGame(board, players);

      for (const edge of board.edges) {
        if (edge.claimable && state.status === 'playing') {
          const currentPlayer = state.players[state.currentPlayerIndex].id;
          const validation = GameEngine.isValidMove(state, board, currentPlayer, edge.id);
          if (validation.valid) {
            state = GameEngine.applyMove(state, board, runtime, currentPlayer, edge.id);
          }
        }
      }

      expect(state.status).toBe('completed');
      let totalScore = 0;
      for (const [, score] of state.scores) {
        totalScore += score;
      }
      expect(totalScore).toBe(board.cells.length);
    });
  });

  describe('Parameter validation', () => {
    it('should throw on size 0', () => {
      expect(() => generateHexagonBoard(0)).toThrow();
    });

    it('should throw on negative size', () => {
      expect(() => generateHexagonBoard(-1)).toThrow();
    });

    it('should throw on non-integer size', () => {
      expect(() => generateHexagonBoard(2.5)).toThrow();
    });
  });
});
