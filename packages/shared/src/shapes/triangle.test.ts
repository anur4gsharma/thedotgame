import { describe, it, expect } from "vitest";
import { generateTriangleBoard } from "./triangle.js";

describe("Triangle Board Generator", () => {
  it("should generate a triangle with side length 3", () => {
    const board = generateTriangleBoard(3);

    // Side length 3: rows 0-3, row r has r+1 vertices
    // Total vertices: 1 + 2 + 3 + 4 = 10
    expect(board.vertices).toHaveLength(10);

    // n² = 9 triangular cells
    expect(board.cells).toHaveLength(9);
  });

  it("should generate a triangle with side length 4", () => {
    const board = generateTriangleBoard(4);

    // Side length 4: rows 0-4, row r has r+1 vertices
    // Total vertices: 1 + 2 + 3 + 4 + 5 = 15
    expect(board.vertices).toHaveLength(15);

    // n² = 16 triangular cells
    expect(board.cells).toHaveLength(16);
  });

  it("should have triangle cell type", () => {
    const board = generateTriangleBoard(3);
    expect(board.cellType).toBe("triangle");
  });

  it("should have triangular symmetry", () => {
    const board = generateTriangleBoard(3);
    expect(board.symmetry).toBe("triangular");
  });

  it("should have all edges claimable", () => {
    const board = generateTriangleBoard(3);
    for (const edge of board.edges) {
      expect(edge.claimable).toBe(true);
    }
  });

  it("should have 3 edges per cell", () => {
    const board = generateTriangleBoard(3);
    for (const cell of board.cells) {
      expect(cell.edgeIds).toHaveLength(3);
      expect(cell.type).toBe("triangle");
    }
  });

  it("should have unique vertex IDs", () => {
    const board = generateTriangleBoard(5);
    const ids = board.vertices.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique edge IDs", () => {
    const board = generateTriangleBoard(5);
    const ids = board.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique cell IDs", () => {
    const board = generateTriangleBoard(5);
    const ids = board.cells.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid vertex references in edges", () => {
    const board = generateTriangleBoard(3);
    const vertexIds = new Set(board.vertices.map((v) => v.id));

    for (const edge of board.edges) {
      expect(vertexIds.has(edge.vertexA)).toBe(true);
      expect(vertexIds.has(edge.vertexB)).toBe(true);
    }
  });

  it("should have valid edge references in cells", () => {
    const board = generateTriangleBoard(3);
    const edgeIds = new Set(board.edges.map((e) => e.id));

    for (const cell of board.cells) {
      for (const edgeId of cell.edgeIds) {
        expect(edgeIds.has(edgeId)).toBe(true);
      }
    }
  });

  it("should have valid vertex references in cells", () => {
    const board = generateTriangleBoard(3);
    const vertexIds = new Set(board.vertices.map((v) => v.id));

    for (const cell of board.cells) {
      for (const vertexId of cell.vertexIds) {
        expect(vertexIds.has(vertexId)).toBe(true);
      }
    }
  });

  it("should have normalized coordinates", () => {
    const board = generateTriangleBoard(3);
    for (const vertex of board.vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0);
      expect(vertex.x).toBeLessThanOrEqual(1);
      expect(vertex.y).toBeGreaterThanOrEqual(0);
      expect(vertex.y).toBeLessThanOrEqual(1);
    }
  });

  it("should have both upward and downward pointing triangles", () => {
    const board = generateTriangleBoard(3);

    // Count upward and downward triangles
    const upward = board.cells.filter((c) => c.id.startsWith("cu-"));
    const downward = board.cells.filter((c) => c.id.startsWith("cd-"));

    // For side length 3: 6 upward + 3 downward = 9 total
    expect(upward).toHaveLength(6);
    expect(downward).toHaveLength(3);
  });
});
