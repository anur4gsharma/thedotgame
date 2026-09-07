import { describe, expect, it, beforeEach } from "vitest";

// Set up mock window and localStorage environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => {
    storage[key] = val;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) delete storage[key];
  },
};

(globalThis as any).window = {
  localStorage: localStorageMock,
  location: { search: "", origin: "http://localhost:3000" },
};

import { useGameStore } from "./game-store.js";
import { DEFAULT_BOARD_VISUAL } from "@dots-game/shared";

describe("client useGameStore unit tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useGameStore.getState().resetGame();
  });

  it("stores and persists player name", () => {
    const { setPlayerName } = useGameStore.getState();
    setPlayerName("CommanderDot");
    expect(useGameStore.getState().playerName).toBe("CommanderDot");
    expect(localStorageMock.getItem("dotgame.playerName")).toBe("CommanderDot");
  });

  it("starts a local match on square board", () => {
    const { startLocalGame } = useGameStore.getState();
    startLocalGame(
      { shape: "square", width: 3, height: 3, visual: DEFAULT_BOARD_VISUAL },
      2,
      30
    );

    const state = useGameStore.getState();
    expect(state.phase).toBe("playing");
    expect(state.mode).toBe("local");
    expect(state.board).not.toBeNull();
    expect(state.board?.cells.length).toBe(9);
    expect(state.state?.status).toBe("playing");
    expect(state.state?.players.length).toBe(2);
    expect(state.localTimerMode).toBe(30);
  });

  it("starts local matches with non-square topologies (triangle, hexagon, octagon)", () => {
    const { startLocalGame } = useGameStore.getState();

    // Triangle
    startLocalGame(
      { shape: "triangle", width: 3, height: 3, visual: DEFAULT_BOARD_VISUAL },
      2,
      0
    );
    let current = useGameStore.getState();
    expect(current.board?.config?.shape).toBe("triangle");
    expect(current.board?.cells.length).toBeGreaterThan(0);
    expect(current.phase).toBe("playing");

    // Hexagon
    startLocalGame(
      { shape: "hexagon", width: 4, height: 4, visual: DEFAULT_BOARD_VISUAL },
      3,
      0
    );
    current = useGameStore.getState();
    expect(current.board?.config?.shape).toBe("hexagon");
    expect(current.state?.players.length).toBe(3);

    // Octagon
    startLocalGame(
      { shape: "octagon", width: 6, height: 6, visual: DEFAULT_BOARD_VISUAL },
      4,
      0
    );
    current = useGameStore.getState();
    expect(current.board?.config?.shape).toBe("octagon");
    expect(current.state?.players.length).toBe(4);
  });

  it("executes local moves and updates turn sequence", () => {
    const { startLocalGame, makeLocalMove } = useGameStore.getState();
    startLocalGame(
      { shape: "square", width: 2, height: 2, visual: DEFAULT_BOARD_VISUAL },
      2,
      0
    );

    const firstEdge = useGameStore.getState().board!.edges.find((e) => e.claimable)!.id;
    makeLocalMove(firstEdge);

    const afterMove = useGameStore.getState();
    expect(afterMove.state?.sequenceNumber).toBe(1);
    expect(afterMove.state?.edges.get(firstEdge)?.owner).toBe("local-1");
  });

  it("validates room code requirements on joinRoom", () => {
    const { joinRoom } = useGameStore.getState();

    joinRoom("ab");
    expect(useGameStore.getState().error).toBe("Enter a 4–12 character room code.");

    joinRoom("invalid!code#");
    expect(useGameStore.getState().error).toBe("Enter a 4–12 character room code.");
  });

  it("resets game state on resetGame", () => {
    const { startLocalGame, resetGame } = useGameStore.getState();
    startLocalGame(
      { shape: "square", width: 2, height: 2, visual: DEFAULT_BOARD_VISUAL },
      2,
      0
    );
    expect(useGameStore.getState().phase).toBe("playing");

    resetGame();
    const state = useGameStore.getState();
    expect(state.board).toBeNull();
    expect(state.state).toBeNull();
    expect(state.mode).toBe("local");
  });

  it("handles room_created and game_started server messages", () => {
    const { handleServerMessage } = useGameStore.getState();

    // 1. room_created
    handleServerMessage({
      version: 1,
      type: "room_created",
      roomCode: "TEST99",
      playerId: "p-host",
      state: {
        roomCode: "TEST99",
        hostId: "p-host",
        settings: {
          board: { shape: "triangle", width: 3, height: 3, visual: DEFAULT_BOARD_VISUAL },
          maxPlayers: 2,
          timerMode: 30,
        },
        players: [
          { id: "p-host", name: "Host", color: "blue", rating: 1200, connected: true, ready: true },
        ],
        status: "lobby",
        version: 1,
      },
    });

    let current = useGameStore.getState();
    expect(current.phase).toBe("lobby");
    expect(current.roomCode).toBe("TEST99");
    expect(current.isHost).toBe(true);

    // 2. game_started
    handleServerMessage({
      version: 1,
      type: "game_started",
      state: {
        boardId: "custom-triangle-3x3",
        status: "playing",
        players: [
          { id: "p-host", name: "Host", color: "blue", connected: true, joinedAt: Date.now() },
          { id: "p-guest", name: "Guest", color: "red", connected: true, joinedAt: Date.now() },
        ],
        currentPlayerIndex: 0,
        edges: { "h-0-0": { owner: null, claimedAt: null } },
        cells: {},
        scores: {},
        moveHistory: [],
        sequenceNumber: 0,
        serverNow: Date.now(),
        turnDeadline: null,
        timerMode: 0,
        timeoutCount: 0,
        startedAt: Date.now(),
        completedAt: null,
      },
    });

    current = useGameStore.getState();
    expect(current.phase).toBe("playing");
    expect(current.board).not.toBeNull();
    expect(current.board?.config?.shape).toBe("triangle");
  });
});
