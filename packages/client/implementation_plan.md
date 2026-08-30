# Multiplayer Lobby & Chat Improvements

This document outlines the architectural and UI changes to transform the prototype lobby and chat into professional, authoritative multiplayer features.

## 1. Chat Architecture

### A. Shared Protocol Types
Add realtime chat messages to `packages/shared/src/types/protocol.ts`:
```ts
// Client -> Server
export interface ChatMessageClient {
  type: "chat_message";
  message: string;
}

// Server -> Client
export interface ChatMessageServer {
  type: "chat_message";
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}
```
Update `ClientMessage` and `ServerMessage` unions.

### B. Server Handling
In `packages/server/src/transport/ws-server.ts`:
- Handle `"chat_message"`.
- Validate user is in a room.
- Trim and validate message (1-200 chars).
- Rate limit: max 5 messages per 2 seconds, dropping excess.
- Construct `ChatMessageServer` with server timestamp.
- Broadcast to room.

### C. Client Store
In `packages/client/src/store/game-store.ts`:
- Add `chatMessages: ChatMessageServer[]` to state.
- Add `sendChatMessage(msg: string)` action.
- Handle `"chat_message"` from server by appending to `chatMessages`.
- Reset `chatMessages` in `resetGame`.

### D. Chat UX
In `packages/client/src/components/game/ChatPanel.tsx`:
- Render messages from store.
- Differentiate local player vs opponent (compare `playerId` with store's `playerId`).
- Display sender's name and a minimalist timestamp (e.g., `12:05`).
- Auto-scroll to bottom on new messages (using a ref and `useEffect`).
- Disable input if not connected.

## 2. Lobby Architecture & UX

### A. Lobby Store State
- Expose `connected` state clearly to the UI.

### B. Lobby UI Enhancements (`Lobby.tsx`)
- Display the user's role: "HOST" or "GUEST".
- Show actual connection status.
- Show Host slot (always filled with Host's name).
- Show Guest slot (Waiting for opponent vs Guest name).
- The "Start" button should only be enabled for the Host when the room is full.
- For Guests, show "WAITING FOR HOST" instead of a disabled start button.
- Make the waiting animation subtle and match the dot-grid aesthetic.
- Preserve the existing editorial layout (typography, spacing, no rounded corners).

## 3. Reliability Improvements

### A. WebSocket Subscription Fix
- Remove the `(window as any).__wsUnsub` hack.
- Since `GameSocket` is a singleton, attach the `handleServerMessage` listener ONCE at the module level in `game-store.ts` (e.g., by calling it right after store creation).

```ts
const socket = getSocket();
socket.onMessage((msg) => {
  useGameStore.getState().handleServerMessage(msg);
});
```

- In `createRoom` and `joinRoom`, just call `socket.connect()` and send the message, knowing the global listener is already active.

### B. Cleanup & Leave Behavior
- When `resetGame` is called, clear `roomCode`, `chatMessages`, etc.
- Call `socket.disconnect()`, which should close the connection and reset local socket state.

## 4. Testing Plan
- Add/update tests in `packages/server/src/transport/__tests__/ws-server.test.ts` to test:
  - Chat broadcasting to the room.
  - Chat rate limiting.
  - Chat validation (empty, too long).
  - Lobby state updates (guest join, host leave).
