import { describe, it, expect, beforeEach } from "vitest";
import { registerShape, getShape, listShapes, clearRegistry } from "./registry.js";
import { generateSquareBoard } from "./square.js";
import { generateTriangleBoard } from "./triangle.js";
import type { BoardDefinition } from "../types/index.js";

describe("Shape Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("should register a shape", () => {
    const board = generateSquareBoard(3, 3);
    registerShape(board);

    const retrieved = getShape("square-3x3");
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe("square-3x3");
  });

  it("should list all registered shapes", () => {
    const square = generateSquareBoard(3, 3);
    const triangle = generateTriangleBoard(3);

    registerShape(square);
    registerShape(triangle);

    const shapes = listShapes();
    expect(shapes).toHaveLength(2);
  });

  it("should reject duplicate IDs", () => {
    const board = generateSquareBoard(3, 3);
    registerShape(board);

    expect(() => registerShape(board)).toThrow("already registered");
  });

  it("should validate vertex references in edges", () => {
    const invalidBoard: BoardDefinition = {
      id: "invalid",
      name: "Invalid Board",
      cellType: "square",
      symmetry: "rectangular",
      vertices: [{ id: "v0", x: 0, y: 0 }],
      edges: [
        {
          id: "e0",
          vertexA: "v0",
          vertexB: "nonexistent", // Invalid reference
          claimable: true,
        },
      ],
      cells: [],
      metadata: {
        description: "Invalid board",
        recommendedPlayerCount: { min: 2, max: 2 },
        difficulty: "easy",
      },
    };

    expect(() => registerShape(invalidBoard)).toThrow(
      "references unknown vertex",
    );
  });

  it("should validate edge references in cells", () => {
    const invalidBoard: BoardDefinition = {
      id: "invalid",
      name: "Invalid Board",
      cellType: "square",
      symmetry: "rectangular",
      vertices: [
        { id: "v0", x: 0, y: 0 },
        { id: "v1", x: 1, y: 0 },
      ],
      edges: [
        { id: "e0", vertexA: "v0", vertexB: "v1", claimable: true },
      ],
      cells: [
        {
          id: "c0",
          type: "square",
          edgeIds: ["e0", "nonexistent"], // Invalid reference
          vertexIds: ["v0", "v1"],
        },
      ],
      metadata: {
        description: "Invalid board",
        recommendedPlayerCount: { min: 2, max: 2 },
        difficulty: "easy",
      },
    };

    expect(() => registerShape(invalidBoard)).toThrow(/references unknown edge|must have exactly 4 edges/);
  });

  it("should return undefined for unknown shape IDs", () => {
    const shape = getShape("nonexistent");
    expect(shape).toBeUndefined();
  });

  it("should clear the registry", () => {
    const board = generateSquareBoard(3, 3);
    registerShape(board);

    expect(listShapes()).toHaveLength(1);

    clearRegistry();

    expect(listShapes()).toHaveLength(0);
  });
});
