import {
  generateSquareBoard,
  generateTriangleBoard,
  generateHexagonBoard,
  generateOctagonBoard,
  type BoardDefinition,
} from "@dots-game/shared";

/**
 * All available board definitions.
 * The server uses these to create games.
 */
export const AVAILABLE_BOARDS: BoardDefinition[] = [
  // Square boards
  generateSquareBoard(3, 3, "square-3x3", "3×3 Square"),
  generateSquareBoard(4, 4, "square-4x4", "4×4 Square"),
  generateSquareBoard(5, 5, "square-5x5", "5×5 Square"),
  generateSquareBoard(6, 6, "square-6x6", "6×6 Square"),
  generateSquareBoard(7, 7, "square-7x7", "7×7 Square"),
  generateSquareBoard(8, 8, "square-8x8", "8×8 Square"),

  // Triangle boards
  generateTriangleBoard(3, "triangle-3", "Triangle (3)"),
  generateTriangleBoard(4, "triangle-4", "Triangle (4)"),
  generateTriangleBoard(5, "triangle-5", "Triangle (5)"),
  generateTriangleBoard(6, "triangle-6", "Triangle (6)"),

  // Hexagonal boards
  generateHexagonBoard(2, "hexagon-2", "Hexagon (2)"),
  generateHexagonBoard(3, "hexagon-3", "Hexagon (3)"),

  // Octagonal boards
  generateOctagonBoard(2, "octagon-2", "Octagon (2)"),
  generateOctagonBoard(3, "octagon-3", "Octagon (3)"),
];

/**
 * Get a board by ID.
 */
export function getBoard(id: string): BoardDefinition | undefined {
  return AVAILABLE_BOARDS.find((b) => b.id === id);
}
