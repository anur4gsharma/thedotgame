import { GameEngine, buildBoardRuntime, type BoardDefinition, type BoardRuntime, type GameState, type Player, type PlayerColor, type RoomSettings } from "@dots-game/shared";
import type { WebSocket } from "ws";
import { generateRoomCode } from "./room-code.js";
import { createRating, updateRatings, type PlayerRating } from "../game/elo.js";
import { config } from "../config.js";

export interface PlayerSession {
  playerId: string;
  playerName: string;
  ws: WebSocket | null;
  connected: boolean;
  color: PlayerColor;
  rating: number;
  ready: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
}

export interface Room {
  code: string;
  hostId: string;
  boardId: string;
  board: BoardDefinition;
  runtime: BoardRuntime;
  settings: RoomSettings;
  maxPlayers: number;
  players: Map<string, PlayerSession>;
  gameState: GameState | null;
  status: "lobby" | "playing" | "completed";
  ratings: Map<string, PlayerRating>;
  createdAt: number;
  lastActivity: number;
  ip: string;
  version: number;
  rematchVotes: Set<string>;
}

export interface RoomResult { room: Room | null; error?: string; }

function defaultSettings(board: BoardDefinition, maxPlayers: number): RoomSettings {
  const width = board.config?.width ?? 5;
  const height = board.config?.height ?? 5;
  return {
    board: board.config ?? {
      width, height,
      visual: {
        preset: "classic", dotSpacing: 1, dotSize: 1, lineThickness: 1, padding: 0.16,
        playerColors: ["#2957A4", "#D94B3D", "#2E8B57", "#D97706"],
        backgroundColor: "#F3F0E8", dotColor: "#161616", lineColor: "#D6D1C5",
        completedCellColors: ["#D7E2F7", "#F6D9D5", "#D9EBDD", "#F8E7C7"],
        hoverColor: "#161616", turnColor: "#161616",
      },
    },
    maxPlayers: Math.min(Math.max(Math.floor(maxPlayers), 2), 4) as 2 | 3 | 4,
    timerMode: 30,
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();
  private ipRoomCount = new Map<string, number>();
  private ratings = new Map<string, PlayerRating>();

  createRoom(boardId: string, board: BoardDefinition, hostId: string, hostName: string, maxPlayers: number, ip: string, settings = defaultSettings(board, maxPlayers)): { room: Room; error?: string } {
    const ipCount = this.ipRoomCount.get(ip) ?? 0;
    if (ipCount >= config.maxRoomsPerIp) return { room: null as unknown as Room, error: "Too many rooms created. Try again later." };
    if (this.rooms.size >= config.maxRooms) return { room: null as unknown as Room, error: "Server is full. Try again later." };

    let code = "";
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = generateRoomCode();
      if (!this.rooms.has(candidate)) { code = candidate; break; }
    }
    if (!code) return { room: null as unknown as Room, error: "Failed to generate a room code. Try again." };

    const now = Date.now();
    const rating = this.ratings.get(hostId) ?? createRating();
    this.ratings.set(hostId, rating);
    const room: Room = {
      code, hostId, boardId, board, runtime: buildBoardRuntime(board),
      settings, maxPlayers: settings.maxPlayers, players: new Map(), gameState: null,
      status: "lobby", ratings: new Map([[hostId, rating]]), createdAt: now,
      lastActivity: now, ip, version: 0, rematchVotes: new Set(),
    };
    room.players.set(hostId, {
      playerId: hostId, playerName: hostName, ws: null, connected: true,
      color: "blue", rating: rating.rating, ready: true, joinedAt: now, disconnectedAt: null,
    });
    this.rooms.set(code, room);
    this.playerToRoom.set(hostId, code);
    this.ipRoomCount.set(ip, ipCount + 1);
    return { room };
  }

  joinRoom(code: string, playerId: string, playerName: string, ws: WebSocket): { room: Room; player: PlayerSession | null; reconnected: boolean; error?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { room: null as unknown as Room, player: null, reconnected: false, error: "Room not found or it has expired." };
    const existing = room.players.get(playerId);
    if (existing) {
      if (existing.ws && existing.ws !== ws && existing.ws.readyState === 1) existing.ws.close(4001, "Session moved to another tab");
      existing.ws = ws; existing.connected = true; existing.disconnectedAt = null;
      room.lastActivity = Date.now();
      return { room, player: existing, reconnected: true };
    }
    if (room.status !== "lobby") return { room: null as unknown as Room, player: null, reconnected: false, error: "This game is already in progress. Use the invite link to reconnect." };
    if (room.players.size >= room.maxPlayers) return { room: null as unknown as Room, player: null, reconnected: false, error: "This room is full." };
    const rating = this.ratings.get(playerId) ?? createRating();
    this.ratings.set(playerId, rating); room.ratings.set(playerId, rating);
    const colors: PlayerColor[] = ["blue", "red", "green", "orange"];
    const used = new Set(Array.from(room.players.values()).map((p) => p.color));
    const color = colors.find((candidate) => !used.has(candidate)) ?? "orange";
    const player: PlayerSession = { playerId, playerName, ws, connected: true, color, rating: rating.rating, ready: true, joinedAt: Date.now(), disconnectedAt: null };
    room.players.set(playerId, player); this.playerToRoom.set(playerId, room.code); room.lastActivity = Date.now();
    return { room, player, reconnected: false };
  }

  startGame(roomCode: string): RoomResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { room: null, error: "Room not found." };
    if (room.status !== "lobby") return { room: null, error: "The game has already started." };
    if (room.players.size < 2) return { room: null, error: "At least two players are required." };
    if (Array.from(room.players.values()).some((p) => !p.ready)) return { room: null, error: "Everyone must be ready." };
    const players: Player[] = Array.from(room.players.values()).map((p) => ({ id: p.playerId, name: p.playerName, color: p.color, connected: p.connected, joinedAt: p.joinedAt }));
    room.gameState = GameEngine.startTimer(GameEngine.createGame(room.board, players), room.settings.timerMode);
    room.status = "playing"; room.version += 1; room.lastActivity = Date.now();
    return { room };
  }

  setReady(roomCode: string, playerId: string, ready: boolean): RoomResult {
    const room = this.rooms.get(roomCode); const player = room?.players.get(playerId);
    if (!room || !player) return { room: null, error: "You are not in this room." };
    if (room.status !== "lobby") return { room: null, error: "The lobby is closed." };
    player.ready = ready; room.version += 1; room.lastActivity = Date.now(); return { room };
  }

  makeMove(roomCode: string, playerId: string, edgeId: string, expectedSequence: number): { room: Room | null; completedCells?: string[]; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState) return { room: null, error: "Game not started." };
    this.expireTurn(roomCode);
    const state = room.gameState;
    const validation = GameEngine.isValidMove(state, room.board, playerId, edgeId, expectedSequence);
    if (!validation.valid) return { room, error: validation.reason };
    const before = new Set(Array.from(state.cells.entries()).filter(([, c]) => c.owner).map(([id]) => id));
    room.gameState = GameEngine.applyMove(state, room.board, room.runtime, playerId, edgeId);
    room.version += 1; room.lastActivity = Date.now();
    const completedCells = Array.from(room.gameState.cells.entries()).filter(([id, c]) => c.owner && !before.has(id)).map(([id]) => id);
    if (room.gameState.status === "completed") { room.status = "completed"; room.gameState = { ...room.gameState, turnDeadline: null }; this.updateRatingsForGame(room); }
    return { room, completedCells };
  }

  expireTurn(roomCode: string): { room: Room | null; expiredPlayerId: string | null; changed: boolean } {
    const room = this.rooms.get(roomCode); if (!room?.gameState) return { room: null, expiredPlayerId: null, changed: false };
    const state = room.gameState; if (state.status !== "playing" || state.turnDeadline === null || Date.now() < state.turnDeadline) return { room, expiredPlayerId: null, changed: false };
    const expiredPlayerId = state.players[state.currentPlayerIndex]?.id ?? null;
    room.gameState = GameEngine.expireTurn(state); room.version += 1; room.lastActivity = Date.now();
    return { room, expiredPlayerId, changed: true };
  }

  reconnectPlayer(playerId: string, roomCode: string, ws: WebSocket): { room: Room | null; player: PlayerSession | null; error?: string } {
    const room = this.rooms.get(roomCode.toUpperCase()); const player = room?.players.get(playerId);
    if (!room || !player) return { room: null, player: null, error: "Your saved session is no longer available." };
    if (player.ws && player.ws !== ws && player.ws.readyState === 1) player.ws.close(4001, "Session moved to another tab");
    player.ws = ws; player.connected = true; player.disconnectedAt = null; room.lastActivity = Date.now(); return { room, player };
  }

  disconnectPlayer(playerId: string): Room | null {
    const room = this.getRoomForPlayer(playerId); const player = room?.players.get(playerId);
    if (!room || !player) return null;
    player.ws = null; player.connected = false; player.disconnectedAt = Date.now(); room.lastActivity = Date.now(); return room;
  }

  removePlayer(playerId: string): Room | null {
    const room = this.getRoomForPlayer(playerId); if (!room) return null;
    room.players.delete(playerId); this.playerToRoom.delete(playerId); room.rematchVotes.delete(playerId);
    if (room.players.size === 0) { this.deleteRoom(room); return null; }
    if (room.hostId === playerId) room.hostId = room.players.keys().next().value as string;
    room.version += 1; room.lastActivity = Date.now(); return room;
  }

  requestRematch(roomCode: string, playerId: string): RoomResult {
    const room = this.rooms.get(roomCode); if (!room || room.status !== "completed" || !room.gameState) return { room: null, error: "Rematch is not available yet." };
    if (room.players.size < 2) return { room: null, error: "Rematch is unavailable because the other player left the room." };
    if (!room.players.has(playerId)) return { room: null, error: "You are not in this room." };
    room.rematchVotes.add(playerId);
    const allConnected = Array.from(room.players.values()).filter((p) => p.connected).every((p) => room.rematchVotes.has(p.playerId));
    if (playerId === room.hostId || allConnected) {
      const players = Array.from(room.players.values()).map((p) => ({ id: p.playerId, name: p.playerName, color: p.color, connected: p.connected, joinedAt: p.joinedAt }));
      room.gameState = GameEngine.startTimer(GameEngine.createGame(room.board, players), room.settings.timerMode);
      room.status = "playing"; room.rematchVotes.clear(); room.version += 1; room.lastActivity = Date.now();
    }
    return { room };
  }

  getRoom(code: string): Room | undefined { return this.rooms.get(code.toUpperCase()); }
  getRoomForPlayer(playerId: string): Room | undefined { const code = this.playerToRoom.get(playerId); return code ? this.rooms.get(code) : undefined; }
  getPlayerRating(playerId: string): PlayerRating { return this.ratings.get(playerId) ?? createRating(); }

  cleanup(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const abandoned = Array.from(room.players.values()).every((p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt > config.playerTimeoutMs);
      if (now - room.lastActivity > config.roomExpiryMs || abandoned) this.deleteRoom(room);
    }
  }

  getStats() { return { rooms: this.rooms.size, players: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.players.size, 0), activeGames: Array.from(this.rooms.values()).filter((r) => r.status === "playing").length }; }

  private deleteRoom(room: Room): void {
    for (const player of room.players.values()) { if (player.ws) player.ws.close(1000, "Room expired"); this.playerToRoom.delete(player.playerId); }
    const count = this.ipRoomCount.get(room.ip) ?? 0; if (count <= 1) this.ipRoomCount.delete(room.ip); else this.ipRoomCount.set(room.ip, count - 1);
    this.rooms.delete(room.code);
  }

  private updateRatingsForGame(room: Room): void {
    if (!room.gameState) return;
    const updated = updateRatings(room.ratings, room.gameState.scores);
    for (const [playerId, rating] of updated) this.ratings.set(playerId, rating);
  }
}
