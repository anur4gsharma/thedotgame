import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSquareBoard } from "@dots-game/shared";
import { RoomManager } from "../rooms/room-manager.js";

describe("RoomManager authoritative flow", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects stale moves and expires the current turn on the server", () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const manager = new RoomManager(); const board = generateSquareBoard(2, 2);
    const created = manager.createRoom(board.id, board, "a", "A", 2, "test");
    const room = created.room; manager.joinRoom(room.code, "b", "B", {} as import("ws").WebSocket);
    manager.startGame(room.code);
    expect(manager.makeMove(room.code, "a", "h-0-0", 99).error).toBe("invalid_sequence");
    room.gameState!.turnDeadline = 10_000;
    const expiry = manager.expireTurn(room.code);
    expect(expiry.changed).toBe(true);
    expect(room.gameState?.currentPlayerIndex).toBe(1);
    expect(room.gameState?.timeoutCount).toBe(1);
  });

  it("keeps a completed room available for rematch without recreating it", () => {
    const manager = new RoomManager(); const board = generateSquareBoard(2, 2);
    const created = manager.createRoom(board.id, board, "a", "A", 2, "test"); const room = created.room;
    manager.joinRoom(room.code, "b", "B", {} as import("ws").WebSocket); manager.startGame(room.code);
    room.status = "completed"; room.gameState!.status = "completed";
    const result = manager.requestRematch(room.code, "a");
    expect(result.error).toBeUndefined(); expect(result.room?.code).toBe(room.code); expect(result.room?.status).toBe("playing"); expect(result.room?.gameState?.sequenceNumber).toBe(0);
  });
});
