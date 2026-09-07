import type { BoardConfig, BoardDefinition } from "../types/index.js";
import { generateSquareBoard } from "./square.js";
import { generateTriangleBoard } from "./triangle.js";
import { generateHexagonBoard } from "./hexagon.js";
import { generateOctagonBoard } from "./octagon.js";

/** Generate one deterministic topology for every supported board shape. */
export function generateBoardFromConfig(config: BoardConfig, id = `${config.shape ?? "square"}-${config.width}x${config.height}`): BoardDefinition {
  const shape = config.shape ?? "square";
  const size = Math.max(2, Math.min(12, Math.round(config.width)));
  let board: BoardDefinition;
  switch (shape) {
    case "triangle": board = generateTriangleBoard(size, id, `Triangle mesh · side ${size}`); break;
    case "hexagon": board = generateHexagonBoard(Math.max(1, Math.min(4, Math.round(size / 2))), id, `Hexagon mesh · size ${Math.max(1, Math.min(4, Math.round(size / 2)))}`); break;
    case "octagon": board = generateOctagonBoard(Math.max(1, Math.min(3, Math.round(size / 3))), id, `Octagon mesh · rings ${Math.max(1, Math.min(3, Math.round(size / 3)))}`); break;
    case "square":
    default: board = generateSquareBoard(size, Math.max(2, Math.min(12, Math.round(config.height))), id, `${config.width}×${config.height} Square Grid`, config.visual);
  }
  board.config = { ...config, shape, width: config.width, height: config.height };
  return board;
}
