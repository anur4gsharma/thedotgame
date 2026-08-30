import {
  generateSquareBoard,
  type BoardDefinition,
} from "@dots-game/shared";

const MIN_SIZE = 3;
const MAX_SIZE = 10;

/**
 * Generate a board dynamically from an ID and optional size.
 * Supports IDs like "square-5x5".
 */
export function getBoard(id: string, size?: number): BoardDefinition | undefined {
  if (!id) return undefined;
  // Try to extract size from the ID
  const match = id.match(/^square-(\d+)x(\d+)$/);
  const cols = size ?? (match ? parseInt(match[1], 10) : undefined);
  const rows = size ?? (match ? parseInt(match[2], 10) : cols);

  if (cols == null || rows == null) return undefined;
  if (cols < MIN_SIZE || cols > MAX_SIZE || rows < MIN_SIZE || rows > MAX_SIZE) return undefined;

  return generateSquareBoard(cols, rows, id, `${cols}×${rows}`);
}
