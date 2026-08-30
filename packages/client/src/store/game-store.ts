import { create } from "zustand";
import {
  GameEngine,
  buildBoardRuntime,
  type BoardDefinition,
  type GameState,
  type BoardRuntime,
  type LobbyState,
  type GameResult,
  generateSquareBoard,
} from "@dots-game/shared";
import { getSocket } from "../lib/websocket";
import { sound } from "../lib/sound";
import { haptics } from "../lib/haptics";

// ─── Board Generation ───────────────────────────────────

function makeBoardFromId(boardId: string, size: number): BoardDefinition {
  return generateSquareBoard(size, size, boardId, `${size}×${size}`);
}

// ─── Game Phase ─────────────────────────────────────────

export type GamePhase = "start" | "menu" | "lobby" | "playing" | "gameover";

// ─── Store State ────────────────────────────────────────

interface GameStore {
  phase: GamePhase;

  // Local game
  board: BoardDefinition | null;
  runtime: BoardRuntime | null;
  state: GameState | null;
  pendingEdge: string | null;

  // Multiplayer
  mode: "local" | "multiplayer";
  roomCode: string | null;
  playerId: string | null;
  playerName: string;
  lobbyState: LobbyState | null;
  isHost: boolean;
  connected: boolean;
  gameResults: GameResult[] | null;
  error: string | null;

  // ELO
  myRating: number;

  // Actions
  setPlayerName: (name: string) => void;
  setMode: (mode: "local" | "multiplayer") => void;

  // Local game
  startLocalGame: (boardId: string, size: number, playerCount: 2 | 3 | 4) => void;
  makeLocalMove: (edgeId: string) => void;

  // Multiplayer
  createRoom: (boardId: string, size: number, maxPlayers: number) => void;
  joinRoom: (roomCode: string) => void;
  startMultiplayerGame: () => void;
  makeMultiplayerMove: (edgeId: string) => void;

  // WebSocket handlers
  handleServerMessage: (msg: any) => void;

  // General
  resetGame: () => void;
  setConnected: (connected: boolean) => void;
}

// ─── Create Store ───────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "start",
  board: null,
  runtime: null,
  state: null,
  pendingEdge: null,
  mode: "local",
  roomCode: null,
  playerId: null,
  playerName: "Player",
  lobbyState: null,
  isHost: false,
  connected: false,
  gameResults: null,
  error: null,
  myRating: 1000,

  setPlayerName: (name) => set({ playerName: name }),
  setMode: (mode) => set({ mode }),
  setConnected: (connected) => set({ connected }),

  // ─── Local Game ───────────────────────────────────────

  startLocalGame: (boardId, size, playerCount) => {
    const board = makeBoardFromId(boardId, size);
    const runtime = buildBoardRuntime(board);
    const { playerName } = get();
    const players = Array.from({ length: playerCount }, (_, i) =>
      GameEngine.createPlayer(`p${i + 1}`, i === 0 ? playerName : `Player ${i + 1}`, i),
    );

    const state = GameEngine.createGame(board, players);
    set({
      phase: "playing",
      board,
      runtime,
      state,
      mode: "local",
      pendingEdge: null,
      gameResults: null,
    });
  },

  makeLocalMove: (edgeId) => {
    const { state, board, runtime } = get();
    if (!state || !board || !runtime) return;

    set({ pendingEdge: edgeId });

    const currentPlayer = state.players[state.currentPlayerIndex];
    const validation = GameEngine.isValidMove(state, board, currentPlayer.id, edgeId);
    if (!validation.valid) {
      set({ pendingEdge: null });
      return;
    }

    const prevCompletedCells = Array.from(state.cells.values()).filter(c => c.owner).length;
    const newState = GameEngine.applyMove(state, board, runtime, currentPlayer.id, edgeId);
    const newCompletedCells = Array.from(newState.cells.values()).filter(c => c.owner).length;

    if (newState.status === "completed") {
      sound.playWin();
      haptics.playWin();
    } else if (newCompletedCells > prevCompletedCells) {
      sound.playScore();
      haptics.playScore();
    } else {
      sound.playMove();
      haptics.playMove();
    }

    set({
      state: newState,
      pendingEdge: null,
      phase: newState.status === "completed" ? "gameover" : "playing",
    });
  },

  // ─── Multiplayer ──────────────────────────────────────

  createRoom: (boardId, size, maxPlayers) => {
    const socket = getSocket();
    socket.connect();
    set({ mode: "multiplayer", error: null });

    if ((window as any).__wsUnsub) {
      (window as any).__wsUnsub();
    }
    const unsubscribe = socket.onMessage((msg) => {
      get().handleServerMessage(msg);
    });

    // Store unsubscribe for cleanup
    (window as any).__wsUnsub = unsubscribe;

    socket.send({
      type: "create_game",
      boardId,
      boardSize: size,
      maxPlayers,
      playerName: get().playerName,
    });
  },

  joinRoom: (roomCode) => {
    const socket = getSocket();
    socket.connect();
    set({ mode: "multiplayer", error: null });

    if ((window as any).__wsUnsub) {
      (window as any).__wsUnsub();
    }
    const unsubscribe = socket.onMessage((msg) => {
      get().handleServerMessage(msg);
    });

    (window as any).__wsUnsub = unsubscribe;

    socket.send({
      type: "join_game",
      roomCode: roomCode.toUpperCase(),
      playerName: get().playerName,
    });
  },

  startMultiplayerGame: () => {
    const socket = getSocket();
    socket.send({ type: "start_game" });
  },

  makeMultiplayerMove: (edgeId) => {
    const socket = getSocket();
    const { state } = get();
    if (!state) return;

    set({ pendingEdge: edgeId });

    socket.send({
      type: "make_move",
      edgeId,
      sequenceNumber: state.sequenceNumber,
    });
  },

  // ─── Server Message Handler ───────────────────────────

  handleServerMessage: (msg) => {
    const s = get();

    switch (msg.type) {
      case "game_created": {
        set({
          roomCode: msg.roomCode,
          playerId: msg.playerId,
          lobbyState: msg.state,
          isHost: true,
          phase: "lobby",
          error: null,
        });
        break;
      }

      case "player_joined":
      case "lobby_state": {
        set({
          lobbyState: msg.state,
          phase: "lobby",
        });
        break;
      }

      case "game_started": {
        const boardId = s.lobbyState?.boardId;
        if (!boardId) break;

        // Extract size from boardId like "square-5x5"
        const match = boardId.match(/(\d+)x(\d+)/);
        const size = match ? parseInt(match[1], 10) : 5;
        const board = makeBoardFromId(boardId, size);

        const runtime = buildBoardRuntime(board);
        const gameState = GameEngine.deserialize(msg.state);

        set({
          board,
          runtime,
          state: gameState,
          phase: "playing",
          gameResults: null,
        });
        break;
      }

      case "move_made": {
        const { state, runtime, board } = get();
        if (!state || !runtime || !board) break;

        // Apply the move optimistically (server confirmed it)
        const edgeState = state.edges.get(msg.edgeId);
        if (edgeState?.owner) break; // Already applied

        const player = state.players.find((p) => p.id === msg.playerId);
        if (!player) break;

        const prevCompletedCells = Array.from(state.cells.values()).filter(c => c.owner).length;
        const newState = GameEngine.applyMove(state, board, runtime, msg.playerId, msg.edgeId);
        const newCompletedCells = Array.from(newState.cells.values()).filter(c => c.owner).length;

        // Override scores and turn from server
        const serverScores = new Map<string, number>();
        for (const [k, v] of Object.entries(msg.scores)) {
          serverScores.set(k, Number(v));
        }
        newState.scores = serverScores;

        const nextPlayerIdx = newState.players.findIndex((p) => p.id === msg.nextPlayer);
        if (nextPlayerIdx >= 0) {
          newState.currentPlayerIndex = nextPlayerIdx;
        }

        newState.sequenceNumber = msg.sequenceNumber;
        
        if (newState.status === "completed") {
          sound.playWin();
          haptics.playWin();
        } else if (newCompletedCells > prevCompletedCells) {
          sound.playScore();
          haptics.playScore();
        } else {
          sound.playMove();
          haptics.playMove();
        }

        set({
          state: newState,
          pendingEdge: null,
          phase: newState.status === "completed" ? "gameover" : "playing",
        });
        break;
      }

      case "move_rejected": {
        set({ pendingEdge: null });
        break;
      }

      case "game_over": {
        set({
          gameResults: msg.results,
          phase: "gameover",
        });
        break;
      }

      case "state_sync": {
        const syncBoardId = msg.state.boardId;
        const match = syncBoardId?.match(/(\d+)x(\d+)/);
        const size = match ? parseInt(match[1], 10) : 5;
        const board = makeBoardFromId(syncBoardId, size);

        const runtime = buildBoardRuntime(board);
        const gameState = GameEngine.deserialize(msg.state);
        set({
          board,
          runtime,
          state: gameState,
          phase: gameState.status === "completed" ? "gameover" : "playing",
        });
        break;
      }

      case "player_reconnected": {
        set((s) => {
          if (!s.state) return s;
          const players = s.state.players.map((p) =>
            p.id === msg.playerId ? { ...p, connected: true } : p
          );
          return { state: { ...s.state, players } };
        });
        break;
      }

      case "player_left": {
        set((s) => {
          if (!s.state) return s;
          const players = s.state.players.map((p) =>
            p.id === msg.playerId ? { ...p, connected: false } : p
          );
          return { state: { ...s.state, players } };
        });
        break;
      }

      case "pong": {
        break;
      }

      case "error": {
        set({ error: msg.message, pendingEdge: null });
        break;
      }
    }
  },

  // ─── General ──────────────────────────────────────────

  resetGame: () => {
    const unsub = (window as any).__wsUnsub;
    if (unsub) unsub();

    const socket = getSocket();
    socket.disconnect();

    set({
      phase: "menu",
      board: null,
      runtime: null,
      state: null,
      pendingEdge: null,
      roomCode: null,
      playerId: null,
      lobbyState: null,
      isHost: false,
      gameResults: null,
      error: null,
    });
  },
}));
