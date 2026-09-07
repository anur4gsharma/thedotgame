# The Dot Game

The Dot Game is a fast, anonymous multiplayer Dots and Boxes game with private rooms, invite links, custom boards, local play, chat, reconnect recovery, and server-authoritative timers.

## Run locally

```bash
pnpm install
pnpm --filter @dots-game/shared build
pnpm --filter @dots-game/server dev
# in another terminal
pnpm --filter @dots-game/client dev
```

Open `http://localhost:3000`. The Vite client falls back to `ws://localhost:3001` only in development. Copy `.env.example` to `.env` when using a different realtime endpoint.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Production deployment

Deploy the client to Vercel and the long-lived WebSocket server to Render (or another WebSocket-capable service). Set `VITE_WS_URL` in Vercel to the server's public `wss://` endpoint. Set `PORT`, `HOST`, and `NODE_ENV=production` on the realtime service. The repository includes `vercel.json`, `render.yaml`, `.env.example`, and a GitHub Actions workflow.

The realtime service is intentionally one stateful coordinator: all rooms live in one process, so rooms cannot split between instances. Keep it as one instance unless the room manager is moved to a per-room Durable Object or shared coordinator. Room state is ephemeral and cleaned up after inactivity; the anonymous session ID is persisted locally only to recover a seat after refresh or a short network interruption.

See [docs/architecture.md](docs/architecture.md) for authority, synchronization, reconnect, and deployment details.

## Product behavior

- The server owns room membership, board rules, scores, turns, deadlines, game-over results, and rematches.
- Clients send versioned intents and render authoritative snapshots.
- Room links use `/?room=ABCD12`; names and room codes are validated in the UI and server.
- Board sizes are bounded to 2×2 through 12×12 and custom visual presets are serialized into room settings.
- Timers support off, 15s, 30s, 45s, 60s, 90s, and 2 minutes.
