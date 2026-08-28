# Dots

A real-time multiplayer shape-based strategy game inspired by Dots and Boxes.

Players claim edges on a board to complete enclosed cells. Complete a cell to score a point and take another turn.

## Board Shapes

- **Square Grid** — classic Dots and Boxes
- **Large Triangle** — triangular cells on a triangular board
- **Hexagonal** — hexagonal silhouette with triangular cells
- **Octagonal** — octagonal silhouette with triangular cells

## Tech Stack

- **Frontend:** React, Vite, TypeScript, SVG
- **Shared:** Deterministic game engine, shape generators
- **State:** Zustand
- **Styling:** CSS Modules, CSS Custom Properties

## Getting Started

```bash
# Install dependencies
pnpm install

# Run dev server
cd packages/client && pnpm dev

# Run tests
cd packages/shared && pnpm test
```

## Project Structure

```
packages/
  shared/    — Game engine, types, shape definitions
  client/    — React frontend
```

## Development

```bash
# Type check
pnpm typecheck

# Build
pnpm build

# Test
pnpm test
```
