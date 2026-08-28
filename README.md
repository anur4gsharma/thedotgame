# The Dot Game (Dots and Boxes)

A multiplayer dots-and-boxes game built with React, Node.js, and WebSockets.

## Features
- Real-time multiplayer gameplay
- Matchmaking and lobby system
- Spectator mode
- Responsive UI

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Shared**: Zod for validation, shared types

## Setup Instructions
1. Clone the repository
2. Install dependencies using `pnpm`:
   ```bash
   pnpm install
   ```
3. Start the development server (runs both frontend and backend concurrently):
   ```bash
   pnpm dev
   ```

## Architecture
The monorepo contains:
- `apps/frontend`: React application
- `apps/backend`: Node.js server
- `packages/shared`: Shared types and logic

## WebSocket Protocol
- `join_lobby`: Request to join matchmaking.
- `game_start`: Broadcasted when a match is found.
- `make_move`: Player attempts to draw a line.
- `game_update`: Broadcasted with the new game state after a valid move.
- `game_over`: Broadcasted when the game concludes.
