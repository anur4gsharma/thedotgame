import type { BoardConfig, TimerMode } from "./board.js";
import type { SerializedGameState, GameResult, PlayerColor } from "./game.js";

export const PROTOCOL_VERSION = 1 as const;

export interface RoomSettings {
  board: BoardConfig;
  maxPlayers: 2 | 3 | 4;
  timerMode: TimerMode;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  rating: number;
  connected: boolean;
  ready: boolean;
}

export interface LobbyState {
  roomCode: string;
  hostId: string;
  settings: RoomSettings;
  players: LobbyPlayer[];
  status: "lobby" | "playing" | "completed";
  version: number;
}

export interface ChatMessageServer {
  type: "chat_message";
  version: typeof PROTOCOL_VERSION;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  messageId: string;
}

interface Envelope { version: typeof PROTOCOL_VERSION; }

export type ClientMessage =
  | ({ type: "create_room"; sessionId: string; playerName: string; settings: RoomSettings } & Envelope)
  | ({ type: "join_room"; sessionId: string; roomCode: string; playerName: string } & Envelope)
  | ({ type: "reconnect"; sessionId: string; roomCode: string } & Envelope)
  | ({ type: "leave_room" } & Envelope)
  | ({ type: "ready"; ready: boolean } & Envelope)
  | ({ type: "start_game" } & Envelope)
  | ({ type: "make_move"; edgeId: string; sequenceNumber: number; requestId: string } & Envelope)
  | ({ type: "request_state"; lastSequenceNumber?: number } & Envelope)
  | ({ type: "send_chat"; message: string; requestId: string } & Envelope)
  | ({ type: "rematch" } & Envelope)
  | ({ type: "ping"; timestamp: number } & Envelope);

export type ServerMessage =
  | ({ type: "room_created"; roomCode: string; playerId: string; state: LobbyState } & Envelope)
  | ({ type: "room_joined"; roomCode: string; playerId: string; state: LobbyState } & Envelope)
  | ({ type: "room_state"; state: LobbyState } & Envelope)
  | ({ type: "player_joined"; player: LobbyPlayer; state: LobbyState } & Envelope)
  | ({ type: "player_left"; playerId: string; state: LobbyState | null } & Envelope)
  | ({ type: "player_reconnected"; playerId: string; state: LobbyState } & Envelope)
  | ({ type: "player_disconnected"; playerId: string; state: LobbyState } & Envelope)
  | ({ type: "game_started"; state: SerializedGameState } & Envelope)
  | ({ type: "move_accepted"; playerId: string; edgeId: string; state: SerializedGameState; requestId: string } & Envelope)
  | ({ type: "move_rejected"; reason: string; sequenceNumber: number; requestId: string } & Envelope)
  | ({ type: "state_snapshot"; state: SerializedGameState } & Envelope)
  | ({ type: "turn_changed"; playerId: string; turnDeadline: number | null; serverNow: number; sequenceNumber: number } & Envelope)
  | ({ type: "timer_started"; playerId: string; turnDeadline: number; serverNow: number; sequenceNumber: number } & Envelope)
  | ({ type: "timer_expired"; playerId: string; state: SerializedGameState } & Envelope)
  | ({ type: "chat_message"; playerId: string; playerName: string; message: string; timestamp: number; messageId: string } & Envelope)
  | ({ type: "game_over"; results: GameResult[]; state: SerializedGameState } & Envelope)
  | ({ type: "rematch_started"; state: SerializedGameState } & Envelope)
  | ({ type: "error"; code: string; message: string; retryable?: boolean } & Envelope)
  | ({ type: "pong"; timestamp: number; serverNow: number } & Envelope);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value) || value.version !== PROTOCOL_VERSION || typeof value.type !== "string") return null;
  const type = value.type;
  if (type === "ping" && typeof value.timestamp === "number") return value as unknown as ClientMessage;
  if (type === "create_room" && typeof value.sessionId === "string" && typeof value.playerName === "string" && isRecord(value.settings)) return value as unknown as ClientMessage;
  if (type === "join_room" && typeof value.sessionId === "string" && typeof value.roomCode === "string" && typeof value.playerName === "string") return value as unknown as ClientMessage;
  if (type === "reconnect" && typeof value.sessionId === "string" && typeof value.roomCode === "string") return value as unknown as ClientMessage;
  if (["leave_room", "start_game", "request_state", "rematch"].includes(type)) return value as unknown as ClientMessage;
  if (type === "ready" && typeof value.ready === "boolean") return value as unknown as ClientMessage;
  if (type === "make_move" && typeof value.edgeId === "string" && Number.isInteger(value.sequenceNumber) && typeof value.requestId === "string") return value as unknown as ClientMessage;
  if (type === "send_chat" && typeof value.message === "string" && typeof value.requestId === "string") return value as unknown as ClientMessage;
  return null;
}
