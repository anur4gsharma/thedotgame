import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_VISUAL, type BoardShape } from "../types/index.js";
import { generateBoardFromConfig } from "./board-factory.js";

const shapes: BoardShape[] = ["square", "triangle", "hexagon", "octagon"];

describe("configurable board factory", () => {
  it.each(shapes)("generates a deterministic %s topology", (shape) => {
    const config = { shape, width: 5, height: 4, visual: DEFAULT_BOARD_VISUAL };
    const first = generateBoardFromConfig(config, `test-${shape}`);
    const second = generateBoardFromConfig(config, `test-${shape}`);

    expect(first).toEqual(second);
    expect(first.config?.shape).toBe(shape);
    expect(first.vertices.length).toBeGreaterThan(0);
    expect(first.edges.length).toBeGreaterThan(0);
    expect(first.cells.length).toBeGreaterThan(0);
    expect(first.edges.every((edge) => first.vertices.some((vertex) => vertex.id === edge.vertexA) && first.vertices.some((vertex) => vertex.id === edge.vertexB))).toBe(true);
    expect(first.cells.every((cell) => cell.edgeIds.every((edgeId) => first.edges.some((edge) => edge.id === edgeId)))).toBe(true);
  });

  it("keeps rectangular square boards rectangular", () => {
    const board = generateBoardFromConfig({ shape: "square", width: 7, height: 3, visual: DEFAULT_BOARD_VISUAL });
    expect(board.cells.filter((cell) => cell.type === "square")).toHaveLength(21);
    expect(board.config?.width).toBe(7);
    expect(board.config?.height).toBe(3);
  });
});
