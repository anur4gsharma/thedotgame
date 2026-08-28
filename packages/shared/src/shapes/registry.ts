import type { BoardDefinition } from "../types/index.js";

// ─── Registry ───────────────────────────────────────────

const shapeRegistry = new Map<string, BoardDefinition>();

/**
 * Register a board definition.
 * Validates the definition before registering.
 */
export function registerShape(def: BoardDefinition): void {
  // Validate vertex references in edges
  const vertexIds = new Set(def.vertices.map((v) => v.id));
  for (const edge of def.edges) {
    if (!vertexIds.has(edge.vertexA)) {
      throw new Error(
        `Edge ${edge.id} references unknown vertex ${edge.vertexA}`,
      );
    }
    if (!vertexIds.has(edge.vertexB)) {
      throw new Error(
        `Edge ${edge.id} references unknown vertex ${edge.vertexB}`,
      );
    }
  }

  // Validate edge references in cells
  const edgeIds = new Set(def.edges.map((e) => e.id));
  for (const cell of def.cells) {
    for (const edgeId of cell.edgeIds) {
      if (!edgeIds.has(edgeId)) {
        throw new Error(
          `Cell ${cell.id} references unknown edge ${edgeId}`,
        );
      }
    }
    for (const vertexId of cell.vertexIds) {
      if (!vertexIds.has(vertexId)) {
        throw new Error(
          `Cell ${cell.id} references unknown vertex ${vertexId}`,
        );
      }
    }
  }

  // Check for duplicate IDs
  if (shapeRegistry.has(def.id)) {
    throw new Error(`Shape with id ${def.id} already registered`);
  }

  shapeRegistry.set(def.id, def);
}

/**
 * Get a board definition by ID.
 */
export function getShape(id: string): BoardDefinition | undefined {
  return shapeRegistry.get(id);
}

/**
 * List all registered shapes.
 */
export function listShapes(): BoardDefinition[] {
  return Array.from(shapeRegistry.values());
}

/**
 * Clear all registered shapes (for testing).
 */
export function clearRegistry(): void {
  shapeRegistry.clear();
}
