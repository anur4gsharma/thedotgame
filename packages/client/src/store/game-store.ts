import { create } from "zustand";
import {
  GameEngine,
  buildBoardRuntime,
  type BoardDefinition,
  type GameState,
  type BoardRuntime,
  SQUARE_5X5,
  TRIANGLE_4,
  HEXAGON_2,
  OCTAGON_2,
} from "@dots-game/shared";

// ─── Available Shapes ───────────────────────────────────

export const AVAILABLE_BOARDS: BoardDefinition[] = [
  SQUARE_5X5,
  TRIANGLE_4,
  HEXAGON_2,
  OCTAGON_2,
];

// ─── Game Phase ─────────────────────────────────────────

export type GamePhase = "menu" | "playing" | "gameover";

// ─── Store State ────────────────────────────────────────

interface GameStore {
  phase: GamePhase;
  board: BoardDefinition | null;
  runtime: BoardRuntime | null;
  state: GameState | null;
  pendingEdge: string | null;
  playerName: string;

  // Actions
  setPlayerName: (name: string) => void;
  startGame: (boardId: string, playerCount: 2 | 3 | 4) => void;
  makeMove: (edgeId: string) => void;
  resetGame: () => void;
}

// ─── Create Store ───────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "menu",
  board: null,
  runtime: null,
  state: null,
  pendingEdge: null,
  playerName: "Player 1",

  setPlayerName: (name: string) => set({ playerName: name }),

  startGame: (boardId: string, playerCount: 2 | 3 | 4) => {
    const board = AVAILABLE_BOARDS.find((b) => b.id === boardId);
    if (!board) return;

    const runtime = buildBoardRuntime(board);
    const players = Array.from({ length: playerCount }, (_, i) =>
      GameEngine.createPlayer(`player-${i + 1}`, `Player ${i + 1}`, i),
    );

    // Override first player's name
    const { playerName } = get();
    players[0].name = playerName;

    const state = GameEngine.createGame(board, players);

    set({
      phase: "playing",
      board,
      runtime,
      state,
      pendingEdge: null,
    });
  },

  makeMove: (edgeId: string) => {
    const { state, board, runtime } = get();
    if (!state || !board || !runtime) return;

    // Optimistic: set pending edge
    set({ pendingEdge: edgeId });

    // Validate move
    const currentPlayer = state.players[state.currentPlayerIndex];
    const validation = GameEngine.isValidMove(state, board, currentPlayer.id, edgeId);

    if (!validation.valid) {
      set({ pendingEdge: null });
      return;
    }

    // Apply move
    const newState = GameEngine.applyMove(state, board, runtime, currentPlayer.id, edgeId);

    set({
      state: newState,
      pendingEdge: null,
      phase: newState.status === "completed" ? "gameover" : "playing",
    });
  },

  resetGame: () =>
    set({
      phase: "menu",
      board: null,
      runtime: null,
      state: null,
      pendingEdge: null,
    }),
}));
