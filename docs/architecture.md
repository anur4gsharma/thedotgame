# The Dot Game architecture

## Runtime shape

The Vite/React client is deployed to Vercel. The Node `ws` service is deployed separately as one long-lived realtime service (Render is configured in `render.yaml`). The realtime service owns room state, game state, turn deadlines, validation, and broadcasts. The browser only renders server snapshots and sends intents.

This is deliberately a single stateful coordinator: a room is never split across request instances. If horizontal scaling is needed later, move `RoomManager` behind one Cloudflare Durable Object per room or add a Redis-backed coordinator; do not run multiple independent in-memory coordinators.

## Authority and recovery

- Every client message carries protocol version `1`; malformed or unsupported messages are rejected without throwing out of the socket handler.
- Room mutations happen synchronously in `RoomManager` and increment a room/game sequence.
- Moves require the current sequence and are validated against the shared `GameEngine`.
- Timers use `turnDeadline = serverNow + duration`; the browser derives display time using the server clock offset.
- A stable anonymous session ID in local storage reconnects a seat after refresh/network loss. A second tab with the same session deterministically takes over the seat.
- `state_snapshot` is the recovery path after a reconnect or stale sequence.

## Deployment

1. Deploy `packages/server` using `render.yaml` (one long-lived instance, WebSocket enabled).
2. Set the Vercel project root to the repository and `VITE_WS_URL` to the server's `wss://` URL.
3. Deploy the client with `vercel.json` or `pnpm --filter @dots-game/client build`.
4. Verify the realtime service's `/health` endpoint before sharing the client URL.

Room state is intentionally ephemeral. Anonymous identity survives reloads, but an active room is not a durable match record and is removed after inactivity/abandonment.
