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

  it("does not restore a completed room through reconnect", () => {
    const manager = new RoomManager(); const board = generateSquareBoard(2, 2);
    const created = manager.createRoom(board.id, board, "a", "A", 2, "test"); const room = created.room;
    room.status = "completed";
    expect(manager.reconnectPlayer("a", room.code, {} as import("ws").WebSocket)).toEqual({ room: null, player: null, error: "This match has ended. Start a new game." });
  });

  it("keeps three-player chances authoritative across multiple transitions", () => {
    const manager = new RoomManager(); const board = generateSquareBoard(3, 3);
    const created = manager.createRoom(board.id, board, "a", "A", 3, "test"); const room = created.room;
    manager.joinRoom(room.code, "b", "B", {} as import("ws").WebSocket);
    manager.joinRoom(room.code, "c", "C", {} as import("ws").WebSocket);
    manager.startGame(room.code);

    const move = (edgeId: string) => {
      const state = room.gameState!;
      const playerId = state.players[state.currentPlayerIndex].id;
      const result = manager.makeMove(room.code, playerId, edgeId, state.sequenceNumber);
      expect(result.error).toBeUndefined();
      return room.gameState!;
    };

    expect(room.gameState?.players[room.gameState.currentPlayerIndex].id).toBe("a");
    expect(room.gameState?.chancesRemaining).toBe(2);
    const afterA1 = move("h-0-0");
    expect(afterA1.players[afterA1.currentPlayerIndex].id).toBe("a");
    expect(afterA1.chancesRemaining).toBe(1);
    expect(manager.makeMove(room.code, "a", "h-0-0", afterA1.sequenceNumber).error).toBe("edge_already_claimed");
    const afterA2 = move("h-1-0");
    expect(afterA2.players[afterA2.currentPlayerIndex].id).toBe("b");
    expect(afterA2.chancesRemaining).toBe(2);
    const afterB1 = move("h-2-0");
    expect(afterB1.chancesRemaining).toBe(1);
    const afterB2 = move("h-0-1");
    expect(afterB2.players[afterB2.currentPlayerIndex].id).toBe("c");
    expect(afterB2.chancesRemaining).toBe(2);
    const afterC1 = move("h-1-1");
    expect(afterC1.chancesRemaining).toBe(1);
    const afterC2 = move("h-2-1");
    expect(afterC2.players[afterC2.currentPlayerIndex].id).toBe("a");
    expect(afterC2.chancesRemaining).toBe(2);
  });
});
