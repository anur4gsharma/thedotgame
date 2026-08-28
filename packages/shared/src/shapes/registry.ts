import type { BoardDefinition } from "../types/index.js";

// ─── Registry ───────────────────────────────────────────

const shapeRegistry = new Map<string, BoardDefinition>();

/**
 * Validates a board definition for structural integrity.
 * Throws an Error if the definition is invalid.
 */
export function validateBoardDefinition(def: BoardDefinition): void {
  const vertexIds = new Set(def.vertices.map((v) => v.id));
  const edgeIds = new Set(def.edges.map((e) => e.id));
  const edgeMap = new Map(def.edges.map((e) => [e.id, e]));

  // Validate vertex references in edges
  for (const edge of def.edges) {
    if (!vertexIds.has(edge.vertexA)) {
      throw new Error(`Edge ${edge.id} references unknown vertex ${edge.vertexA}`);
    }
    if (!vertexIds.has(edge.vertexB)) {
      throw new Error(`Edge ${edge.id} references unknown vertex ${edge.vertexB}`);
    }
  }

  const edgesInCells = new Set<string>();

  // Validate cells
  for (const cell of def.cells) {
    // 3. Correct edge count per cell type
    if (cell.type === "triangle" && cell.edgeIds.length !== 3) {
      throw new Error(`Triangle cell ${cell.id} must have exactly 3 edges`);
    }
    if (cell.type === "square" && cell.edgeIds.length !== 4) {
      throw new Error(`Square cell ${cell.id} must have exactly 4 edges`);
    }

    const cellVertexIds = new Set(cell.vertexIds);
    for (const vertexId of cell.vertexIds) {
      if (!vertexIds.has(vertexId)) {
        throw new Error(`Cell ${cell.id} references unknown vertex ${vertexId}`);
      }
    }

    const adj = new Map<string, string[]>();

    for (const edgeId of cell.edgeIds) {
      if (!edgeIds.has(edgeId)) {
        throw new Error(`Cell ${cell.id} references unknown edge ${edgeId}`);
      }
      edgesInCells.add(edgeId);

      const edge = edgeMap.get(edgeId)!;
      // 1. Edge-vertex incidence check
      if (!cellVertexIds.has(edge.vertexA) || !cellVertexIds.has(edge.vertexB)) {
        throw new Error(`Edge ${edgeId} in cell ${cell.id} connects vertices not in cell's vertexIds`);
      }

      // Adjacency for closed cycle check
      if (!adj.has(edge.vertexA)) adj.set(edge.vertexA, []);
      adj.get(edge.vertexA)!.push(edge.vertexB);
      if (!adj.has(edge.vertexB)) adj.set(edge.vertexB, []);
      adj.get(edge.vertexB)!.push(edge.vertexA);
    }

    // 2. Closed cycle check
    for (const v of cell.vertexIds) {
      const neighbors = adj.get(v);
      if (!neighbors || neighbors.length !== 2) {
        throw new Error(`Cell ${cell.id} edges do not form a simple closed polygon (vertex ${v} has degree ${neighbors?.length || 0} instead of 2)`);
      }
    }
    
    // Check if the cycle spans all vertices of the cell
    const visited = new Set<string>();
    const start = cell.vertexIds[0];
    if (start) {
      let curr = start;
      let prev: string | null = null;
      while (true) {
        visited.add(curr);
        const neighbors = adj.get(curr)!;
        const next = neighbors[0] !== prev ? neighbors[0] : neighbors[1];
        if (!next || visited.has(next)) break;
        prev = curr;
        curr = next;
      }
      if (visited.size !== cell.vertexIds.length) {
        throw new Error(`Cell ${cell.id} edges do not form a single connected closed polygon`);
      }
    }
  }

  // 4. Orphan edge check
  for (const edge of def.edges) {
    if (edge.claimable && !edgesInCells.has(edge.id)) {
      throw new Error(`Claimable edge ${edge.id} does not belong to any cell`);
    }
  }

  // 5. Orphan vertex check
  const verticesInEdges = new Set<string>();
  for (const edge of def.edges) {
    verticesInEdges.add(edge.vertexA);
    verticesInEdges.add(edge.vertexB);
  }
  for (const vertex of def.vertices) {
    if (!verticesInEdges.has(vertex.id)) {
      throw new Error(`Vertex ${vertex.id} is not an endpoint of any edge`);
    }
  }
}

/**
 * Register a board definition.
 * Validates the definition before registering.
 */
export function registerShape(def: BoardDefinition): void {
  validateBoardDefinition(def);

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
