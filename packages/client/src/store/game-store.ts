import { create } from "zustand";
import { GameEngine, buildBoardRuntime, generateSquareBoard, DEFAULT_BOARD_VISUAL, PROTOCOL_VERSION, type BoardConfig, type BoardDefinition, type BoardRuntime, type ClientMessage, type GameResult, type GameState, type LobbyState, type ServerMessage, type RoomSettings, type SerializedGameState, type TimerMode, type ChatMessageServer } from "@dots-game/shared";
import { getSocket } from "../lib/websocket";
import { sound } from "../lib/sound";
import { haptics } from "../lib/haptics";

export type GamePhase = "start" | "menu" | "lobby" | "playing" | "gameover";
const SESSION_KEY = "dotgame.sessionId";
const ROOM_KEY = "dotgame.roomCode";
const NAME_KEY = "dotgame.playerName";

function storageGet(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } }
function storageSet(key: string, value: string): void { try { window.localStorage.setItem(key, value); } catch { /* storage may be disabled */ } }
function storageRemove(key: string): void { try { window.localStorage.removeItem(key); } catch { /* storage may be disabled */ } }
function id(): string { const cryptoApi = globalThis.crypto; return cryptoApi?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

const sessionId = storageGet(SESSION_KEY) ?? id(); storageSet(SESSION_KEY, sessionId);
const message = <T extends ClientMessage["type"]>(type: T, fields: Omit<Extract<ClientMessage, { type: T }>, "type" | "version">): Extract<ClientMessage, { type: T }> => ({ type, version: PROTOCOL_VERSION, ...fields } as Extract<ClientMessage, { type: T }>);

function boardFromConfig(config: BoardConfig): BoardDefinition {
  const safe: BoardConfig = { ...config, visual: { ...DEFAULT_BOARD_VISUAL, ...config.visual } };
  return generateSquareBoard(safe.width, safe.height, `custom-${safe.width}x${safe.height}`, `${safe.width}×${safe.height} Board`, safe.visual);
}

function friendlyReason(reason: string): string { const labels: Record<string, string> = { not_your_turn: "It is not your turn.", edge_already_claimed: "That line has already been claimed.", invalid_sequence: "The board changed. Resyncing…", game_already_over: "The game is already over.", game_not_started: "The game has not started yet.", edge_not_found: "That line is not on this board.", player_not_in_game: "You are no longer in this match." }; return labels[reason] ?? reason; }

interface GameStore {
  phase: GamePhase; mode: "local" | "multiplayer"; board: BoardDefinition | null; runtime: BoardRuntime | null; state: GameState | null; pendingEdge: string | null;
  roomCode: string | null; playerId: string | null; playerName: string; sessionId: string; lobbyState: LobbyState | null; isHost: boolean; connected: boolean; gameResults: GameResult[] | null; error: string | null; chatMessages: ChatMessageServer[]; serverOffset: number; localTimerMode: TimerMode; localTimerDeadline: number | null;
  setPlayerName: (name: string) => void; startLocalGame: (config: BoardConfig, playerCount: 2 | 3 | 4, timerMode: TimerMode) => void; makeLocalMove: (edgeId: string) => void; expireLocalTurn: () => void;
  createRoom: (settings: RoomSettings) => void; joinRoom: (roomCode: string) => void; setReady: (ready: boolean) => void; startMultiplayerGame: () => void; makeMultiplayerMove: (edgeId: string) => void; requestState: () => void; rematch: () => void; sendChatMessage: (msg: string) => void; restoreSession: () => void; resetGame: () => void; setConnected: (connected: boolean) => void; handleServerMessage: (msg: ServerMessage) => void;
}

function serializeReadyBoard(state: LobbyState): BoardDefinition { return boardFromConfig(state.settings.board); }

export const useGameStore = create<GameStore>((set, get) => ({
  phase: storageGet(NAME_KEY) ? "menu" : "start", mode: "local", board: null, runtime: null, state: null, pendingEdge: null, roomCode: null, playerId: sessionId, playerName: storageGet(NAME_KEY) ?? "", sessionId, lobbyState: null, isHost: false, connected: false, gameResults: null, error: null, chatMessages: [], serverOffset: 0, localTimerMode: 0, localTimerDeadline: null,
  setPlayerName: (name) => { const clean = name.trim().slice(0, 20); storageSet(NAME_KEY, clean); set({ playerName: clean }); },
  setConnected: (connected) => set({ connected }),

  startLocalGame: (config, playerCount, timerMode) => {
    const board = boardFromConfig(config); const players = Array.from({ length: playerCount }, (_, index) => GameEngine.createPlayer(`local-${index + 1}`, index === 0 ? get().playerName || "Player 1" : `Player ${index + 1}`, index));
    const state = GameEngine.startTimer(GameEngine.createGame(board, players), timerMode); set({ phase: "playing", mode: "local", board, runtime: buildBoardRuntime(board), state, localTimerMode: timerMode, localTimerDeadline: state.turnDeadline, gameResults: null, pendingEdge: null, error: null });
  },
  makeLocalMove: (edgeId) => {
    const { state, board, runtime } = get(); if (!state || !board || !runtime) return;
    const playerId = state.players[state.currentPlayerIndex]?.id; if (!playerId) return;
    const validation = GameEngine.isValidMove(state, board, playerId, edgeId, state.sequenceNumber); if (!validation.valid) return;
    const next = GameEngine.applyMove(state, board, runtime, playerId, edgeId); const scored = next.moveHistory.at(-1)?.completedCells.length ?? 0;
    if (next.status === "completed") { sound.playWin(); haptics.playWin(); } else if (scored > 0) { sound.playScore(); haptics.playScore(); } else { sound.playMove(); haptics.playMove(); }
    set({ state: next, localTimerDeadline: next.turnDeadline, phase: next.status === "completed" ? "gameover" : "playing" });
  },
  expireLocalTurn: () => { const { state, localTimerMode } = get(); if (!state || !state.turnDeadline || Date.now() < state.turnDeadline) return; const next = GameEngine.expireTurn(state); set({ state: next, localTimerMode, localTimerDeadline: next.turnDeadline }); },

  createRoom: (settings) => { storageRemove(ROOM_KEY); set({ mode: "multiplayer", roomCode: null, error: null }); getSocket().send(message("create_room", { sessionId, playerName: get().playerName || "Player", settings })); },
  joinRoom: (roomCode) => { const code = roomCode.trim().toUpperCase(); if (!/^[A-Z0-9]{4,12}$/.test(code)) { set({ error: "Enter a 4–12 character room code." }); return; } set({ mode: "multiplayer", roomCode: null, error: null }); getSocket().send(message("join_room", { sessionId, roomCode: code, playerName: get().playerName || "Player" })); },
  setReady: (ready) => getSocket().send(message("ready", { ready })),
  startMultiplayerGame: () => getSocket().send(message("start_game", {})),
  makeMultiplayerMove: (edgeId) => { const state = get().state; if (!state || get().pendingEdge) return; set({ pendingEdge: edgeId }); getSocket().send(message("make_move", { edgeId, sequenceNumber: state.sequenceNumber, requestId: id() })); },
  requestState: () => getSocket().send(message("request_state", {})),
  rematch: () => getSocket().send(message("rematch", {})),
  sendChatMessage: (msg) => { const clean = msg.trim(); if (clean) getSocket().send(message("send_chat", { message: clean.slice(0, 250), requestId: id() })); },
  restoreSession: () => { const roomCode = storageGet(ROOM_KEY); if (!roomCode || !get().playerName) return; set({ mode: "multiplayer", roomCode, phase: "lobby" }); getSocket().connect(); },

  handleServerMessage: (msg) => {
    const applyState = (serialized: SerializedGameState, phaseOverride?: GamePhase): void => {
      const current = get().state; if (current && serialized.sequenceNumber < current.sequenceNumber) return;
      const state = GameEngine.deserialize(serialized); const lobby = get().lobbyState; const board = lobby ? serializeReadyBoard(lobby) : get().board ?? boardFromConfig({ width: 5, height: 5, visual: DEFAULT_BOARD_VISUAL });
      const offset = serialized.serverNow - Date.now(); set({ state, board, runtime: buildBoardRuntime(board), serverOffset: offset, localTimerDeadline: null, pendingEdge: null, phase: phaseOverride ?? (state.status === "completed" ? "gameover" : "playing") });
    };
    switch (msg.type) {
      case "room_created": case "room_joined": set({ mode: "multiplayer", roomCode: msg.roomCode, playerId: msg.playerId, lobbyState: msg.state, isHost: msg.state.hostId === msg.playerId, phase: "lobby", error: null }); storageSet(ROOM_KEY, msg.roomCode); break;
      case "room_state": case "player_joined": case "player_reconnected": case "player_disconnected": set({ lobbyState: msg.state, phase: "lobby" }); break;
      case "player_left": if (msg.state) set({ lobbyState: msg.state }); break;
      case "game_started": case "rematch_started": applyState(msg.state); break;
      case "state_snapshot": applyState(msg.state); break;
      case "move_accepted": applyState(msg.state); break;
      case "timer_expired": applyState(msg.state); break;
      case "move_rejected": set({ pendingEdge: null, error: friendlyReason(msg.reason) }); if (msg.reason === "invalid_sequence") get().requestState(); break;
      case "game_over": applyState(msg.state, "gameover"); set({ gameResults: msg.results }); break;
      case "chat_message": set((state) => ({ chatMessages: [...state.chatMessages.slice(-99), msg] })); break;
      case "error": set({ error: msg.message, pendingEdge: null }); break;
      case "pong": set({ serverOffset: msg.serverNow - Date.now() }); break;
      case "turn_changed": set((state) => state.state ? { state: { ...state.state, turnDeadline: msg.turnDeadline, currentPlayerIndex: Math.max(0, state.state.players.findIndex((player) => player.id === msg.playerId)) }, serverOffset: msg.serverNow - Date.now() } : state); break;
      case "timer_started": set((state) => state.state ? { state: { ...state.state, turnDeadline: msg.turnDeadline, timerMode: state.state.timerMode }, serverOffset: msg.serverNow - Date.now() } : state); break;
    }
  },
  resetGame: () => { const socket = getSocket(); if (get().roomCode) socket.send(message("leave_room", {})); socket.disconnect(); storageRemove(ROOM_KEY); set({ phase: get().playerName ? "menu" : "start", mode: "local", board: null, runtime: null, state: null, pendingEdge: null, roomCode: null, lobbyState: null, isHost: false, gameResults: null, error: null, chatMessages: [], localTimerDeadline: null }); },
}));

const socket = getSocket();
socket.onMessage((msg) => useGameStore.getState().handleServerMessage(msg));
socket.onConnectionChange((connected) => { const snapshot = useGameStore.getState(); snapshot.setConnected(connected); if (connected && snapshot.roomCode && snapshot.mode === "multiplayer") socket.send(message("reconnect", { sessionId, roomCode: snapshot.roomCode })); });
