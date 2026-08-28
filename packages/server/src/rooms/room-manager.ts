import { GameEngine, buildBoardRuntime, type BoardDefinition, type GameState, type Player, type BoardRuntime } from "@dots-game/shared";
import { generateRoomCode } from "./room-code.js";
import { createRating, updateRatings, type PlayerRating } from "../game/elo.js";
import { config } from "../config.js";

// ─── Room State ─────────────────────────────────────────

export interface Room {
  code: string;
  hostId: string;
  boardId: string;
  board: BoardDefinition;
  runtime: BoardRuntime;
  maxPlayers: number;
  players: Map<string, PlayerSession>;
  gameState: GameState | null;
  status: "lobby" | "playing" | "completed";
  ratings: Map<string, PlayerRating>;
  createdAt: number;
  lastActivity: number;
}

export interface PlayerSession {
  playerId: string;
  playerName: string;
  ws: import("ws").WebSocket | null;
  connected: boolean;
  color: import("@dots-game/shared").PlayerColor;
  rating: number;
}

// ─── Room Manager ───────────────────────────────────────

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>(); // playerId → roomCode
  private ipRoomCount = new Map<string, number>(); // ip → room count
  private ratings = new Map<string, PlayerRating>(); // persistent ratings

  /**
   * Create a new room.
   */
  createRoom(
    boardId: string,
    board: BoardDefinition,
    hostId: string,
    hostName: string,
    maxPlayers: number,
    ip: string,
  ): { room: Room; error?: string } {
    // Rate limit check
    const ipCount = this.ipRoomCount.get(ip) || 0;
    if (ipCount >= config.maxRoomsPerIp) {
      return { room: null as any, error: "Too many rooms created. Try again later." };
    }

    // Max rooms check
    if (this.rooms.size >= config.maxRooms) {
      return { room: null as any, error: "Server is full. Try again later." };
    }

    // Generate unique room code
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 100) {
        return { room: null as any, error: "Failed to generate room code." };
      }
    } while (this.rooms.has(code));

    const runtime = buildBoardRuntime(board);
    const now = Date.now();

    const room: Room = {
      code,
      hostId,
      boardId,
      board,
      runtime,
      maxPlayers: Math.min(maxPlayers, config.maxPlayersPerRoom),
      players: new Map(),
      gameState: null,
      status: "lobby",
      ratings: new Map(),
      createdAt: now,
      lastActivity: now,
    };

    // Get or create host rating
    const hostRating = this.ratings.get(hostId) || createRating();
    this.ratings.set(hostId, hostRating);

    // Add host as first player
    const hostColor = "blue" as const;
    room.players.set(hostId, {
      playerId: hostId,
      playerName: hostName,
      ws: null,
      connected: true,
      color: hostColor,
      rating: hostRating.rating,
    });

    this.rooms.set(code, room);
    this.playerToRoom.set(hostId, code);
    this.ipRoomCount.set(ip, ipCount + 1);

    return { room };
  }

  /**
   * Join an existing room.
   */
  joinRoom(
    code: string,
    playerId: string,
    playerName: string,
    ws: import("ws").WebSocket,
  ): { room: Room; player: PlayerSession; error?: string } {
    const room = this.rooms.get(code);
    if (!room) {
      return { room: null as any, player: null as any, error: "Room not found." };
    }

    if (room.status !== "lobby") {
      return { room: null as any, player: null as any, error: "Game already in progress." };
    }

    if (room.players.size >= room.maxPlayers) {
      return { room: null as any, player: null as any, error: "Room is full." };
    }

    if (room.players.has(playerId)) {
      // Reconnection
      const existing = room.players.get(playerId)!;
      existing.ws = ws;
      existing.connected = true;
      room.lastActivity = Date.now();
      return { room, player: existing };
    }

    // Get or create rating
    const rating = this.ratings.get(playerId) || createRating();
    this.ratings.set(playerId, rating);

    // Assign color
    const usedColors = new Set(Array.from(room.players.values()).map((p) => p.color));
    const allColors: import("@dots-game/shared").PlayerColor[] = ["blue", "red", "green", "orange"];
    const color = allColors.find((c) => !usedColors.has(c)) || allColors[room.players.size % 4];

    const player: PlayerSession = {
      playerId,
      playerName,
      ws,
      connected: true,
      color,
      rating: rating.rating,
    };

    room.players.set(playerId, player);
    this.playerToRoom.set(playerId, code);
    room.lastActivity = Date.now();

    return { room, player };
  }

  /**
   * Start the game.
   */
  startGame(roomCode: string): { room: Room; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { room: null as any, error: "Room not found." };

    if (room.players.size < 2) {
      return { room: null as any, error: "Need at least 2 players." };
    }

    // Create game state
    const players: Player[] = Array.from(room.players.values()).map((ps) =>
      GameEngine.createPlayer(ps.playerId, ps.playerName, Array.from(room.players.keys()).indexOf(ps.playerId)),
    );

    room.gameState = GameEngine.createGame(room.board, players);
    room.status = "playing";
    room.lastActivity = Date.now();

    return { room };
  }

  /**
   * Make a move.
   */
  makeMove(
    roomCode: string,
    playerId: string,
    edgeId: string,
  ): { room: Room; error?: string; completedCells?: string[] } {
    const room = this.rooms.get(roomCode);
    if (!room) return { room: null as any, error: "Room not found." };
    if (!room.gameState) return { room: null as any, error: "Game not started." };

    // Validate move
    const validation = GameEngine.isValidMove(
      room.gameState,
      room.board,
      playerId,
      edgeId,
    );

    if (!validation.valid) {
      return { room, error: validation.reason };
    }

    // Apply move
    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    const oldScores = new Map(room.gameState.scores);
    room.gameState = GameEngine.applyMove(
      room.gameState,
      room.board,
      room.runtime,
      currentPlayer.id,
      edgeId,
    );

    // Check for completed cells
    const completedCells: string[] = [];
    for (const [cellId, cellState] of room.gameState.cells) {
      const oldScore = oldScores.get(cellState.owner || "") || 0;
      const newScore = room.gameState.scores.get(cellState.owner || "") || 0;
      if (cellState.owner && newScore > oldScore && cellState.owner === currentPlayer.id) {
        completedCells.push(cellId);
      }
    }

    room.lastActivity = Date.now();

    // Handle game completion
    if (room.gameState.status === "completed") {
      room.status = "completed";
      this.updateRatingsForGame(room);
    }

    return { room, completedCells };
  }

  /**
   * Handle player disconnect.
   */
  disconnectPlayer(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (player) {
      player.ws = null;
      player.connected = false;
    }

    room.lastActivity = Date.now();
    return room;
  }

  /**
   * Remove player from room entirely.
   */
  removePlayer(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);

    // If room is empty, remove it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return null;
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
      room.hostId = room.players.keys().next().value!;
    }

    room.lastActivity = Date.now();
    return room;
  }

  /**
   * Get room by code.
   */
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /**
   * Get room for a player.
   */
  getRoomForPlayer(playerId: string): Room | undefined {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  /**
   * Get player's persistent rating.
   */
  getPlayerRating(playerId: string): PlayerRating {
    return this.ratings.get(playerId) || createRating();
  }

  /**
   * Update ELO ratings after game completion.
   */
  private updateRatingsForGame(room: Room): void {
    if (!room.gameState) return;

    const scores = new Map<string, number>();
    for (const [playerId, score] of room.gameState.scores) {
      scores.set(playerId, score);
    }

    const updatedRatings = updateRatings(room.ratings, scores);

    // Persist ratings
    for (const [playerId, rating] of updatedRatings) {
      this.ratings.set(playerId, rating);
    }
  }

  /**
   * Cleanup expired rooms.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > config.roomExpiryMs) {
        // Disconnect all players
        for (const player of room.players.values()) {
          if (player.ws) {
            player.ws.close(1000, "Room expired");
          }
          this.playerToRoom.delete(player.playerId);
        }
        this.rooms.delete(code);
      }
    }
  }

  /**
   * Get server stats.
   */
  getStats() {
    return {
      rooms: this.rooms.size,
      players: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.players.size, 0),
      activeGames: Array.from(this.rooms.values()).filter((r) => r.status === "playing").length,
    };
  }
}
