import type { BoardDefinition, VertexDef, EdgeDef, CellDef } from "../types/index.js";

/**
 * Generate a hexagonal silhouette board using triangular cells.
 *
 * Strategy: Create a hexagonal arrangement of vertices and triangulate the interior.
 *
 * The hexagon is centered at (0.5, 0.5) with a given radius.
 * We use a "hex grid" approach where we place vertices in a hexagonal pattern
 * and connect them with triangular cells.
 *
 * For a hexagon of "size" s:
 * - We create a hexagonal grid of vertices
 * - Connect adjacent vertices to form triangles
 * - Only keep cells that fall within the hexagonal boundary
 */
export function generateHexagonBoard(
  size: number,
  id?: string,
  name?: string,
): BoardDefinition {
  // Generate hexagonal grid vertices
  const vertices: VertexDef[] = [];
  const vertexGrid = new Map<string, string>(); // "q,r" → vertex id

  // Hex grid using axial coordinates (q, r)
  // A hex of size s includes all hexes where |q| <= s, |r| <= s, |q+r| <= s
  const hexes: Array<{ q: number; r: number }> = [];
  for (let q = -size; q <= size; q++) {
    for (let r = -size; r <= size; r++) {
      if (Math.abs(q + r) <= size) {
        hexes.push({ q, r });
      }
    }
  }

  // Convert hex centers to vertex positions
  // Each hex center becomes a vertex
  for (const hex of hexes) {
    const id = `v-${hex.q}-${hex.r}`;
    // Axial to pixel (flat-top hexagons)
    const x = (3 / 2) * hex.q;
    const y = (Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r;

    vertices.push({ id, x, y });
    vertexGrid.set(`${hex.q},${hex.r}`, id);
  }

  // Generate edges and cells by connecting adjacent hex centers
  // Each hex has 6 neighbors
  const directions = [
    { dq: 1, dr: 0 },   // East
    { dq: 1, dr: -1 },  // North-east
    { dq: 0, dr: -1 },  // North-west
    { dq: -1, dr: 0 },  // West
    { dq: -1, dr: 1 },  // South-west
    { dq: 0, dr: 1 },   // South-east
  ];

  const edges: EdgeDef[] = [];
  const cells: CellDef[] = [];
  const edgeSet = new Set<string>();

  for (const hex of hexes) {
    const v1 = vertexGrid.get(`${hex.q},${hex.r}`);
    if (!v1) continue;

    // Connect to neighbors (only in 3 directions to avoid duplicates)
    const neighborDirs = [0, 1, 2]; // East, NE, NW
    for (const dirIdx of neighborDirs) {
      const dir = directions[dirIdx];
      const nq = hex.q + dir.dq;
      const nr = hex.r + dir.dr;
      const v2 = vertexGrid.get(`${nq},${nr}`);

      if (!v2) continue;

      // Create edge (sorted to avoid duplicates)
      const edgeId = [v1, v2].sort().join("--");
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        edges.push({
          id: `e-${edges.length}`,
          vertexA: v1,
          vertexB: v2,
          claimable: true,
        });
      }
    }
  }

  // Generate triangular cells from the hex grid
  // Each pair of adjacent hexes forms a triangle with a third vertex
  // We need to create triangles from the Delaunay-like triangulation

  // Actually, for a cleaner approach: create a triangular mesh
  // by connecting each hex center to its 6 neighbors, forming 6 triangles per hex
  // Then keep only triangles where all 3 vertices are within the hex boundary

  for (const hex of hexes) {
    const v0 = vertexGrid.get(`${hex.q},${hex.r}`);
    if (!v0) continue;

    // For each pair of adjacent neighbors, form a triangle
    for (let i = 0; i < 6; i++) {
      const dir1 = directions[i];
      const dir2 = directions[(i + 1) % 6];

      const v1 = vertexGrid.get(`${hex.q + dir1.dq},${hex.r + dir1.dr}`);
      const v2 = vertexGrid.get(`${hex.q + dir2.dq},${hex.r + dir2.dr}`);

      if (!v1 || !v2) continue;

      // Check if this triangle is already created (by the other vertex)
      const triKey = [v0, v1, v2].sort().join("-");
      const cellId = `tri-${triKey}`;

      // Only create if not already exists
      if (!cells.find((c) => c.id === cellId)) {
        // Find edges for this triangle
        const edgeKeys = [
          [v0, v1].sort().join("--"),
          [v0, v2].sort().join("--"),
          [v1, v2].sort().join("--"),
        ];

        const edgeIds = edgeKeys
          .map((key) => {
            const edge = edges.find((e) => {
              const eKey = [e.vertexA, e.vertexB].sort().join("--");
              return eKey === key;
            });
            return edge?.id;
          })
          .filter((id): id is string => id !== undefined);

        // Only create cell if all 3 edges exist
        if (edgeIds.length === 3) {
          cells.push({
            id: cellId,
            type: "triangle",
            edgeIds,
            vertexIds: [v0, v1, v2],
          });
        }
      }
    }
  }

  // Normalize coordinates to 0..1 range
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 0.1;

  for (const v of vertices) {
    v.x = padding + ((v.x - minX) / rangeX) * (1 - 2 * padding);
    v.y = padding + ((v.y - minY) / rangeY) * (1 - 2 * padding);
  }

  return {
    id: id || `hexagon-${size}`,
    name: name || `Hexagon (size ${size})`,
    cellType: "triangle",
    symmetry: "radial",
    vertices,
    edges,
    cells,
    metadata: {
      description: `A hexagonal silhouette with ${cells.length} triangular cells`,
      recommendedPlayerCount: { min: 2, max: 4 },
      difficulty: "medium",
    },
  };
}

// ─── Predefined Sizes ───────────────────────────────────

export const HEXAGON_2 = generateHexagonBoard(2, "hexagon-2", "Hexagon (size 2)");
export const HEXAGON_3 = generateHexagonBoard(3, "hexagon-3", "Hexagon (size 3)");
