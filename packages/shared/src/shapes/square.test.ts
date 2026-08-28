import { describe, it, expect } from "vitest";
import { generateSquareBoard } from "./square.js";

describe("Square Board Generator", () => {
  it("should generate a 3x3 board with correct counts", () => {
    const board = generateSquareBoard(3, 3);

    // 4x4 = 16 vertices
    expect(board.vertices).toHaveLength(16);

    // 3 horizontal rows × 4 vertices = 12 horizontal edges
    // 4 vertical columns × 3 vertices = 12 vertical edges
    // Total = 24 edges
    expect(board.edges).toHaveLength(24);

    // 3x3 = 9 cells
    expect(board.cells).toHaveLength(9);
  });

  it("should generate a 5x5 board with correct counts", () => {
    const board = generateSquareBoard(5, 5);

    // 6x6 = 36 vertices
    expect(board.vertices).toHaveLength(36);

    // 5 horizontal rows × 6 vertices = 30 horizontal edges
    // 6 vertical columns × 5 vertices = 30 vertical edges
    // Total = 60 edges
    expect(board.edges).toHaveLength(60);

    // 5x5 = 25 cells
    expect(board.cells).toHaveLength(25);
  });

  it("should have square cell type", () => {
    const board = generateSquareBoard(3, 3);
    expect(board.cellType).toBe("square");
  });

  it("should have rectangular symmetry", () => {
    const board = generateSquareBoard(3, 3);
    expect(board.symmetry).toBe("rectangular");
  });

  it("should have all edges claimable", () => {
    const board = generateSquareBoard(3, 3);
    for (const edge of board.edges) {
      expect(edge.claimable).toBe(true);
    }
  });

  it("should have 4 edges per cell", () => {
    const board = generateSquareBoard(3, 3);
    for (const cell of board.cells) {
      expect(cell.edgeIds).toHaveLength(4);
      expect(cell.type).toBe("square");
    }
  });

  it("should have unique vertex IDs", () => {
    const board = generateSquareBoard(5, 5);
    const ids = board.vertices.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique edge IDs", () => {
    const board = generateSquareBoard(5, 5);
    const ids = board.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique cell IDs", () => {
    const board = generateSquareBoard(5, 5);
    const ids = board.cells.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid vertex references in edges", () => {
    const board = generateSquareBoard(3, 3);
    const vertexIds = new Set(board.vertices.map((v) => v.id));

    for (const edge of board.edges) {
      expect(vertexIds.has(edge.vertexA)).toBe(true);
      expect(vertexIds.has(edge.vertexB)).toBe(true);
    }
  });

  it("should have valid edge references in cells", () => {
    const board = generateSquareBoard(3, 3);
    const edgeIds = new Set(board.edges.map((e) => e.id));

    for (const cell of board.cells) {
      for (const edgeId of cell.edgeIds) {
        expect(edgeIds.has(edgeId)).toBe(true);
      }
    }
  });

  it("should have valid vertex references in cells", () => {
    const board = generateSquareBoard(3, 3);
    const vertexIds = new Set(board.vertices.map((v) => v.id));

    for (const cell of board.cells) {
      for (const vertexId of cell.vertexIds) {
        expect(vertexIds.has(vertexId)).toBe(true);
      }
    }
  });

  it("should have normalized coordinates between 0 and 1", () => {
    const board = generateSquareBoard(3, 3);
    for (const vertex of board.vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0);
      expect(vertex.x).toBeLessThanOrEqual(1);
      expect(vertex.y).toBeGreaterThanOrEqual(0);
      expect(vertex.y).toBeLessThanOrEqual(1);
    }
  });
});
