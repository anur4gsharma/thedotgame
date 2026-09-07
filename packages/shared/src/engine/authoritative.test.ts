import { describe, expect, it } from "vitest";
import { buildBoardRuntime, GameEngine } from "./game-engine.js";
import { generateSquareBoard } from "../shapes/square.js";
import { parseClientMessage, PROTOCOL_VERSION } from "../types/protocol.js";

describe("authoritative game safety", () => {
  const board = generateSquareBoard(2, 2);
  const players = [GameEngine.createPlayer("a", "A", 0), GameEngine.createPlayer("b", "B", 1)];

  it("rejects stale and duplicate moves without mutating state", () => {
    const runtime = buildBoardRuntime(board);
    const initial = GameEngine.createGame(board, players);
    const next = GameEngine.applyMove(initial, board, runtime, "a", "h-0-0");
    expect(GameEngine.isValidMove(next, board, "b", "h-0-0", 0)).toEqual({ valid: false, reason: "edge_already_claimed" });
    expect(GameEngine.isValidMove(next, board, "a", "v-0-0", 0)).toEqual({ valid: false, reason: "not_your_turn" });
    expect(GameEngine.isValidMove(next, board, "b", "v-0-0", next.sequenceNumber).valid).toBe(true);
  });

  it("expires a turn only at the server deadline and advances exactly once", () => {
    const initial = GameEngine.startTimer(GameEngine.createGame(board, players), 15, 10_000);
    expect(GameEngine.expireTurn(initial, 24_999)).toBe(initial);
    const expired = GameEngine.expireTurn(initial, 25_000);
    expect(expired.currentPlayerIndex).toBe(1);
    expect(expired.timeoutCount).toBe(1);
    expect(expired.turnDeadline).toBe(40_000);
    expect(GameEngine.expireTurn(expired, 25_001)).toBe(expired);
  });

  it("round-trips timer and duration metadata", () => {
    const state = GameEngine.startTimer(GameEngine.createGame(board, players), 30, 100);
    const restored = GameEngine.deserialize(GameEngine.serialize(state));
    expect(restored.turnDeadline).toBe(30_100);
    expect(restored.timerMode).toBe(30);
    expect(restored.startedAt).toBe(state.startedAt);
  });
});

describe("protocol validation", () => {
  it("rejects missing or wrong protocol versions", () => {
    expect(parseClientMessage({ type: "ping", timestamp: 1 })).toBeNull();
    expect(parseClientMessage({ version: 99, type: "ping", timestamp: 1 })).toBeNull();
    expect(parseClientMessage({ version: PROTOCOL_VERSION, type: "make_move", edgeId: "h-0-0", sequenceNumber: 0, requestId: "r1" })?.type).toBe("make_move");
  });
});
