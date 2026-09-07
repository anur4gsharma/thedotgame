import {
  generateBoardFromConfig,
  DEFAULT_BOARD_VISUAL,
  type BoardConfig,
  type BoardVisualConfig,
  type BoardDefinition,
} from "@dots-game/shared";

export const MIN_SIZE = 2;
export const MAX_SIZE = 12;

function safeVisual(visual: Partial<BoardVisualConfig> | undefined): BoardVisualConfig {
  return { ...DEFAULT_BOARD_VISUAL, ...visual };
}

export function normalizeBoardConfig(input: BoardConfig): BoardConfig | undefined {
  if (!input || !Number.isInteger(input.width) || !Number.isInteger(input.height)) return undefined;
  if (input.width < MIN_SIZE || input.width > MAX_SIZE || input.height < MIN_SIZE || input.height > MAX_SIZE) return undefined;
  const shape = input.shape ?? "square";
  if (!["square", "triangle", "hexagon", "octagon"].includes(shape)) return undefined;
  const visual = safeVisual(input.visual);
  const numericVisuals = [visual.dotSpacing, visual.dotSize, visual.lineThickness, visual.padding];
  if (numericVisuals.some((value) => !Number.isFinite(value)) || visual.dotSpacing < 0.5 || visual.dotSpacing > 2 || visual.dotSize < 0.5 || visual.dotSize > 2 || visual.lineThickness < 0.5 || visual.lineThickness > 2 || visual.padding < 0.05 || visual.padding > 0.4) return undefined;
  return { shape, width: input.width, height: input.height, visual };
}

/**
 * Generate a board dynamically from an ID and optional size.
 * Supports IDs like "square-5x5".
 */
export function getBoard(id: string, size?: number, config?: BoardConfig): BoardDefinition | undefined {
  if (config) {
    const normalized = normalizeBoardConfig(config);
    if (!normalized) return undefined;
    return generateBoardFromConfig(normalized, id);
  }
  if (!id) return undefined;
  // Try to extract size from the ID
  const match = id.match(/^square-(\d+)x(\d+)$/);
  const cols = size ?? (match ? parseInt(match[1], 10) : undefined);
  const rows = size ?? (match ? parseInt(match[2], 10) : cols);

  if (cols == null || rows == null) return undefined;
  if (cols < MIN_SIZE || cols > MAX_SIZE || rows < MIN_SIZE || rows > MAX_SIZE) return undefined;

  return generateBoardFromConfig({ shape: "square", width: cols, height: rows, visual: DEFAULT_BOARD_VISUAL }, id);
}
