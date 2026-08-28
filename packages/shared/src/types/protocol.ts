import type { SerializedGameState, GameResult, Player } from "./game.js";

// ─── Client → Server Messages ───────────────────────────

export type ClientMessage =
  | CreateGameMessage
  | JoinGameMessage
  | MakeMoveMessage
  | ReconnectMessage
  | LeaveGameMessage
  | PingMessage;

export interface CreateGameMessage {
  type: "create_game";
  boardId: string;
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

export interface PingMessage {
  type: "ping";
  timestamp: number;
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
  | ErrorMessage
  | PongMessage;

export interface GameCreatedMessage {
  type: "game_created";
  roomCode: string;
  playerId: string;
  state: SerializedGameState;
}

export interface PlayerJoinedMessage {
  type: "player_joined";
  player: Player;
  state: SerializedGameState;
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

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export interface PongMessage {
  type: "pong";
  timestamp: number;
}
