import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { RoomManager } from "../rooms/room-manager.js";
import { config } from "../config.js";
import { getBoard } from "../boards.js";
import { GameEngine } from "@dots-game/shared";
import type { ClientMessage, ServerMessage } from "@dots-game/shared";

// ─── Connection State ───────────────────────────────────

interface ConnectionState {
  playerId: string;
  playerName: string;
  roomCode: string | null;
  lastActivity: number;
  moveTimestamps: number[];
}

// ─── WebSocket Server ───────────────────────────────────

export function createWsServer(roomManager: RoomManager) {
  const wss = new WebSocketServer({ noServer: true });
  const connections = new Map<WebSocket, ConnectionState>();

  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function broadcast(roomCode: string, msg: ServerMessage, exclude?: WebSocket) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    for (const player of room.players.values()) {
      if (player.ws && player.ws !== exclude && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(msg));
      }
    }
  }

  function buildLobbyState(room: ReturnType<RoomManager["getRoom"]> & {}) {
    return {
      boardId: room.boardId,
      roomCode: room.code,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.playerId,
        name: p.playerName,
        color: p.color,
        rating: p.rating,
        connected: p.connected,
      })),
      status: room.status,
    };
  }

  function handleMessage(ws: WebSocket, state: ConnectionState, msg: ClientMessage, ip: string) {
    switch (msg.type) {
      case "create_game": {
        const board = getBoard(msg.boardId, msg.boardSize);
        if (!board) {
          send(ws, { type: "error", code: "INVALID_BOARD", message: "Invalid board" });
          return;
        }

        const { room, error } = roomManager.createRoom(
          msg.boardId, board, state.playerId, msg.playerName, msg.maxPlayers, ip,
        );

        if (error || !room) {
          send(ws, { type: "error", code: "CREATE_FAILED", message: error || "Failed" });
          return;
        }

        state.roomCode = room.code;
        state.playerName = msg.playerName;
        room.players.get(state.playerId)!.ws = ws;

        send(ws, {
          type: "game_created",
          roomCode: room.code,
          playerId: state.playerId,
          state: buildLobbyState(room),
        });
        break;
      }

      case "join_game": {
        const result = roomManager.joinRoom(
          msg.roomCode.toUpperCase(), state.playerId, msg.playerName, ws,
        );

        if (result.error || !result.room) {
          send(ws, { type: "error", code: "JOIN_FAILED", message: result.error || "Failed" });
          return;
        }

        state.roomCode = result.room.code;
        state.playerName = msg.playerName;

        const lobbyState = buildLobbyState(result.room);
        const lobbyPlayer = { id: result.player.playerId, name: result.player.playerName, color: result.player.color, rating: result.player.rating, connected: result.player.connected };
        send(ws, { 
          type: "game_joined", 
          roomCode: result.room.code,
          playerId: result.player.playerId,
          state: lobbyState 
        });
        broadcast(result.room.code, { type: "player_joined", player: lobbyPlayer, state: lobbyState }, ws);
        break;
      }

      case "start_game": {
        if (!state.roomCode) {
          send(ws, { type: "error", code: "NOT_IN_ROOM", message: "Not in a room" });
          return;
        }

        const room = roomManager.getRoom(state.roomCode);
        if (!room) return;

        if (room.hostId !== state.playerId) {
          send(ws, { type: "error", code: "NOT_HOST", message: "Only the host can start" });
          return;
        }

        const { error } = roomManager.startGame(state.roomCode);
        if (error) {
          send(ws, { type: "error", code: "START_FAILED", message: error });
          return;
        }

        const updatedRoom = roomManager.getRoom(state.roomCode);
        if (updatedRoom?.gameState) {
          const serialized = GameEngine.serialize(updatedRoom.gameState);
          broadcast(state.roomCode, { type: "game_started", state: serialized });
        }
        break;
      }

      case "make_move": {
        if (!state.roomCode) {
          send(ws, { type: "error", code: "NOT_IN_ROOM", message: "Not in a room" });
          return;
        }

        const now = Date.now();
        state.moveTimestamps = state.moveTimestamps.filter(t => now - t < 1000);
        if (state.moveTimestamps.length >= config.maxMovesPerSecond) {
          send(ws, { type: "error", code: "RATE_LIMITED", message: "Too many moves" });
          return;
        }
        state.moveTimestamps.push(now);

        const result = roomManager.makeMove(state.roomCode, state.playerId, msg.edgeId);

        if (result.error) {
          send(ws, { type: "move_rejected", reason: result.error, sequenceNumber: msg.sequenceNumber });
          return;
        }

        const room = result.room;
        if (!room.gameState) return;

        broadcast(room.code, {
          type: "move_made",
          playerId: state.playerId,
          edgeId: msg.edgeId,
          completedCells: result.completedCells || [],
          scores: Object.fromEntries(room.gameState.scores),
          nextPlayer: room.gameState.players[room.gameState.currentPlayerIndex].id,
          sequenceNumber: room.gameState.sequenceNumber,
        });

        if (room.gameState.status === "completed") {
          const gameResults = GameEngine.getGameResult(room.gameState);
          broadcast(room.code, { type: "game_over", results: gameResults });
        }
        break;
      }

      case "leave_game": {
        if (state.roomCode) {
          const room = roomManager.removePlayer(state.playerId);
          if (room) {
            broadcast(room.code, { type: "player_left", playerId: state.playerId });
          }
          state.roomCode = null;
        }
        break;
      }

      case "reconnect": {
        const result = roomManager.joinRoom(msg.roomCode.toUpperCase(), msg.playerId, state.playerName, ws);
        if (result.error || !result.room) {
          send(ws, { type: "error", code: "JOIN_FAILED", message: result.error || "Failed" });
          return;
        }
        
        state.playerId = msg.playerId;
        state.roomCode = result.room.code;
        state.playerName = result.player.playerName;

        const lobbyState = buildLobbyState(result.room);
        const lobbyPlayer = { id: result.player.playerId, name: result.player.playerName, color: result.player.color, rating: result.player.rating, connected: result.player.connected };
        
        send(ws, { 
          type: "game_joined", 
          roomCode: result.room.code,
          playerId: result.player.playerId,
          state: lobbyState 
        });
        
        if (result.room.status === "playing" && result.room.gameState) {
          send(ws, { type: "game_started", state: GameEngine.serialize(result.room.gameState) });
        }
        
        broadcast(result.room.code, { type: "player_joined", player: lobbyPlayer, state: lobbyState }, ws);
        break;
      }

      case "ping": {
        send(ws, { type: "pong", timestamp: msg.timestamp });
        break;
      }

      case "chat_message": {
        if (!state.roomCode) {
          send(ws, { type: "error", code: "NOT_IN_ROOM", message: "Not in a room" });
          return;
        }

        const text = msg.message?.trim();
        if (!text || text.length === 0 || text.length > 250) {
          send(ws, { type: "error", code: "INVALID_CHAT", message: "Invalid chat message length" });
          return;
        }

        // Apply simple rate limiting (max 5 per 2 seconds)
        const now = Date.now();
        state.moveTimestamps = state.moveTimestamps.filter(t => now - t < 2000);
        if (state.moveTimestamps.length >= 5) {
          send(ws, { type: "error", code: "RATE_LIMITED", message: "Chat rate limited" });
          return;
        }
        state.moveTimestamps.push(now);

        broadcast(state.roomCode, {
          type: "chat_message",
          playerId: state.playerId,
          playerName: state.playerName,
          message: text,
          timestamp: now,
        });
        break;
      }
    }
  }

  // Handle upgrade
  wss.on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  // Handle connection
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const playerId = `p-${Math.random().toString(36).substring(2, 10)}`;
    const state: ConnectionState = {
      playerId,
      playerName: "Player",
      roomCode: null,
      lastActivity: Date.now(),
      moveTimestamps: [],
    };

    connections.set(ws, state);

    ws.on("message", (data) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());
        state.lastActivity = Date.now();
        handleMessage(ws, state, msg, ip);
      } catch {
        send(ws, { type: "error", code: "INVALID_MESSAGE", message: "Invalid message" });
      }
    });

    ws.on("close", () => {
      const room = roomManager.disconnectPlayer(state.playerId);
      if (room) {
        broadcast(room.code, { type: "player_left", playerId: state.playerId });
      }
      connections.delete(ws);
    });

    ws.on("pong", () => {
      state.lastActivity = Date.now();
    });
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const state = connections.get(ws);
      if (!state) return;
      if (Date.now() - state.lastActivity > config.heartbeatTimeoutMs) {
        ws.terminate();
        return;
      }
      ws.ping();
    });
  }, config.heartbeatIntervalMs);

  // Cleanup
  const cleanup = setInterval(() => roomManager.cleanup(), 60_000);

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(cleanup);
  });

  return wss;
}
