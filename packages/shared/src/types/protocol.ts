import type { SerializedGameState, GameResult } from "./game.js";

// ─── Client → Server Messages ───────────────────────────

export type ClientMessage =
  | CreateGameMessage
  | JoinGameMessage
  | MakeMoveMessage
  | ReconnectMessage
  | LeaveGameMessage
  | StartGameMessage
  | PingMessage
  | ChatMessageClient;

export interface CreateGameMessage {
  type: "create_game";
  boardId: string;
  boardSize?: number;
  maxPlayers: number;
  playerName: string;
}

export interface JoinGameMessage {
  type: "join_game";
  roomCode: string;
  playerName: string;
}

export interface MakeMoveMessage {
  type: "make_move";
  edgeId: string;
  sequenceNumber: number;
}

export interface ReconnectMessage {
  type: "reconnect";
  playerId: string;
  roomCode: string;
}

export interface LeaveGameMessage {
  type: "leave_game";
}

export interface StartGameMessage {
  type: "start_game";
}

export interface PingMessage {
  type: "ping";
  timestamp: number;
}

export interface ChatMessageClient {
  type: "chat_message";
  message: string;
}

// ─── Server → Client Messages ───────────────────────────

export type ServerMessage =
  | GameCreatedMessage
  | PlayerJoinedMessage
  | GameStartedMessage
  | MoveMadeMessage
  | MoveRejectedMessage
  | StateSyncMessage
  | PlayerLeftMessage
  | PlayerReconnectedMessage
  | GameOverMessage
  | LobbyStateMessage
  | ErrorMessage
  | PongMessage
  | ChatMessageServer;

export interface ChatMessageServer {
  type: "chat_message";
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameCreatedMessage {
  type: "game_created";
  roomCode: string;
  playerId: string;
  state: LobbyState;
}

export interface PlayerJoinedMessage {
  type: "player_joined";
  player: LobbyPlayer;
  state: LobbyState;
}

export interface GameStartedMessage {
  type: "game_started";
  state: SerializedGameState;
}

export interface MoveMadeMessage {
  type: "move_made";
  playerId: string;
  edgeId: string;
  completedCells: string[];
  scores: Record<string, number>;
  nextPlayer: string;
  sequenceNumber: number;
}

export interface MoveRejectedMessage {
  type: "move_rejected";
  reason: string;
  sequenceNumber: number;
}

export interface StateSyncMessage {
  type: "state_sync";
  state: SerializedGameState;
  sequenceNumber: number;
}

export interface PlayerLeftMessage {
  type: "player_left";
  playerId: string;
}

export interface PlayerReconnectedMessage {
  type: "player_reconnected";
  playerId: string;
}

export interface GameOverMessage {
  type: "game_over";
  results: GameResult[];
}

export interface LobbyStateMessage {
  type: "lobby_state";
  state: LobbyState;
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export interface PongMessage {
  type: "pong";
  timestamp: number;
}

// ─── Lobby Types ────────────────────────────────────────

export interface LobbyState {
  boardId: string;
  roomCode: string;
  hostId: string;
  maxPlayers: number;
  players: LobbyPlayer[];
  status: "lobby" | "playing" | "completed";
}

export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  rating: number;
  connected: boolean;
}
