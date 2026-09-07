import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { randomUUID } from "node:crypto";
import { RoomManager, type Room } from "../rooms/room-manager.js";
import { config } from "../config.js";
import { getBoard, normalizeBoardConfig } from "../boards.js";
import { GameEngine, PROTOCOL_VERSION, parseClientMessage, type LobbyPlayer, type LobbyState, type RoomSettings, type ServerMessage } from "@dots-game/shared";

interface ConnectionState {
  sessionId: string;
  playerName: string;
  roomCode: string | null;
  lastActivity: number;
  moveTimestamps: number[];
  chatTimestamps: number[];
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim().slice(0, max);
  return result.length > 0 ? result : null;
}

export function createWsServer(roomManager: RoomManager) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  const connections = new Map<WebSocket, ConnectionState>();
  const timerHandles = new Map<string, ReturnType<typeof setTimeout>>();

  const send = (ws: WebSocket, message: ServerMessage): void => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };

  const sendRaw = (ws: WebSocket, value: Record<string, unknown>): void => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));
  };

  const broadcast = (roomCode: string, message: ServerMessage, exclude?: WebSocket): void => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    for (const player of room.players.values()) {
      if (player.ws && player.ws !== exclude && player.ws.readyState === WebSocket.OPEN) send(player.ws, message);
    }
  };

  const lobbyPlayer = (room: Room, playerId: string): LobbyPlayer => {
    const player = room.players.get(playerId);
    if (!player) throw new Error("Player not found");
    return { id: player.playerId, name: player.playerName, color: player.color, rating: player.rating, connected: player.connected, ready: player.ready };
  };

  const lobbyState = (room: Room): LobbyState => ({
    roomCode: room.code,
    hostId: room.hostId,
    settings: room.settings,
    players: Array.from(room.players.keys()).map((id) => lobbyPlayer(room, id)),
    status: room.status,
    version: room.version,
  });

  const withVersion = <T extends { type: string }>(message: T): T & { version: typeof PROTOCOL_VERSION } => ({ ...message, version: PROTOCOL_VERSION });

  const broadcastState = (room: Room): void => sendRoom(room, withVersion({ type: "room_state", state: lobbyState(room) }));
  const sendRoom = (room: Room, message: ServerMessage): void => {
    for (const player of room.players.values()) if (player.ws) send(player.ws, message);
  };

  const sendSnapshot = (ws: WebSocket, room: Room): void => {
    if (room.gameState) send(ws, withVersion({ type: "state_snapshot", state: GameEngine.serialize(room.gameState) }));
  };

  const scheduleTimer = (room: Room): void => {
    const old = timerHandles.get(room.code);
    if (old) clearTimeout(old);
    const deadline = room.gameState?.turnDeadline;
    if (!deadline || room.status !== "playing") { timerHandles.delete(room.code); return; }
    const delay = Math.max(0, deadline - Date.now());
    const handle = setTimeout(() => {
      const result = roomManager.expireTurn(room.code);
      if (result.changed && result.room && result.expiredPlayerId) {
        const state = GameEngine.serialize(result.room.gameState!);
        sendRoom(result.room, withVersion({ type: "timer_expired", playerId: result.expiredPlayerId, state }));
        sendRoom(result.room, withVersion({ type: "turn_changed", playerId: state.players[state.currentPlayerIndex].id, turnDeadline: state.turnDeadline, serverNow: state.serverNow, sequenceNumber: state.sequenceNumber }));
        scheduleTimer(result.room);
      } else if (result.room) scheduleTimer(result.room);
    }, delay + 5);
    timerHandles.set(room.code, handle);
  };

  const normalizeLegacy = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    if (record.version === PROTOCOL_VERSION) return record;
    switch (record.type) {
      case "create_game": { const match = typeof record.boardId === "string" ? record.boardId.match(/(\d+)x(\d+)/) : null; const size = typeof record.boardSize === "number" ? record.boardSize : Number(match?.[1] ?? 5); return withVersion({ type: "create_room", sessionId: "", playerName: record.playerName, settings: { board: { width: size, height: Number(match?.[2] ?? size), visual: {} }, maxPlayers: record.maxPlayers ?? 2, timerMode: 30 } }); }
      case "join_game": return withVersion({ type: "join_room", sessionId: "", roomCode: record.roomCode, playerName: record.playerName });
      case "reconnect": return withVersion({ type: "reconnect", sessionId: record.playerId, roomCode: record.roomCode });
      case "leave_game": return withVersion({ type: "leave_room" });
      case "start_game": return withVersion({ type: "start_game" });
      case "chat_message": return withVersion({ type: "send_chat", message: record.message, requestId: `legacy-${Date.now()}` });
      case "make_move": return withVersion({ type: "make_move", edgeId: record.edgeId, sequenceNumber: record.sequenceNumber, requestId: `legacy-${Date.now()}` });
      case "ping": return withVersion({ type: "ping", timestamp: record.timestamp });
      default: return record;
    }
  };

  const handleMessage = (ws: WebSocket, connection: ConnectionState, raw: unknown, ip: string): void => {
    const legacyClient = typeof raw === "object" && raw !== null && !("version" in raw);
    const message = parseClientMessage(normalizeLegacy(raw));
    if (!message) { send(ws, withVersion({ type: "error", code: "INVALID_MESSAGE", message: "Message is malformed or uses an unsupported protocol version." })); return; }
    connection.lastActivity = Date.now();
    const room = connection.roomCode ? roomManager.getRoom(connection.roomCode) : undefined;

    switch (message.type) {
      case "ping": send(ws, withVersion({ type: "pong", timestamp: message.timestamp, serverNow: Date.now() })); return;
      case "create_room": {
        const name = text(message.playerName, 20); if (!name) { send(ws, withVersion({ type: "error", code: "INVALID_NAME", message: "Enter a name between 1 and 20 characters." })); return; }
        const boardWidth = message.settings.board.width;
        const normalizedBoard = normalizeBoardConfig(message.settings.board);
        const board = getBoard(`custom-${boardWidth}x${message.settings.board.height}`, boardWidth, message.settings.board);
        if (!board) { send(ws, withVersion({ type: "error", code: "INVALID_BOARD", message: "Choose a board between 2×2 and 12×12." })); return; }
        if (!normalizedBoard || ![2, 3, 4].includes(message.settings.maxPlayers) || ![0, 15, 30, 45, 60, 90, 120].includes(message.settings.timerMode)) { send(ws, withVersion({ type: "error", code: "INVALID_SETTINGS", message: "Those room settings are not supported." })); return; }
        const settings: RoomSettings = { board: normalizedBoard, maxPlayers: message.settings.maxPlayers, timerMode: message.settings.timerMode };
        const sessionId = text(message.sessionId, 80) ?? `p-${randomUUID()}`;
        const result = roomManager.createRoom(board.id, board, sessionId, name, settings.maxPlayers, ip, settings);
        if (result.error || !result.room) { send(ws, withVersion({ type: "error", code: "CREATE_FAILED", message: result.error ?? "Could not create the room." })); return; }
        connection.sessionId = sessionId; connection.playerName = name; connection.roomCode = result.room.code;
        result.room.players.get(sessionId)!.ws = ws;
        const state = lobbyState(result.room);
        if (legacyClient) sendRaw(ws, { type: "game_created", roomCode: result.room.code, playerId: sessionId, state: { boardId: result.room.boardId, roomCode: result.room.code, hostId: result.room.hostId, maxPlayers: result.room.maxPlayers, players: state.players, status: result.room.status } });
        else send(ws, withVersion({ type: "room_created", roomCode: result.room.code, playerId: sessionId, state }));
        return;
      }
      case "join_room": {
        const name = text(message.playerName, 20); const code = text(message.roomCode, 12)?.toUpperCase();
        if (!name || !code || !/^[A-Z0-9]{4,12}$/.test(code)) { send(ws, withVersion({ type: "error", code: "INVALID_ROOM_CODE", message: "Enter a valid room code." })); return; }
        const sessionId = text(message.sessionId, 80) ?? `p-${randomUUID()}`;
        const result = roomManager.joinRoom(code, sessionId, name, ws);
        if (result.error || !result.room || !result.player) { send(ws, withVersion({ type: "error", code: "JOIN_FAILED", message: result.error ?? "Could not join the room." })); return; }
        connection.sessionId = sessionId; connection.playerName = result.player.playerName; connection.roomCode = result.room.code;
        const state = lobbyState(result.room);
        if (legacyClient) sendRaw(ws, { type: "game_joined", roomCode: result.room.code, playerId: sessionId, state: { boardId: result.room.boardId, roomCode: result.room.code, hostId: result.room.hostId, maxPlayers: result.room.maxPlayers, players: state.players, status: result.room.status } });
        else send(ws, withVersion({ type: "room_joined", roomCode: result.room.code, playerId: sessionId, state }));
        if (result.reconnected) {
          broadcast(result.room.code, withVersion({ type: "player_reconnected", playerId: sessionId, state }), ws);
          sendSnapshot(ws, result.room);
          if (result.room.gameState) send(ws, withVersion({ type: "game_started", state: GameEngine.serialize(result.room.gameState) }));
        } else {
          broadcast(result.room.code, withVersion({ type: "player_joined", player: lobbyPlayer(result.room, sessionId), state }), ws);
        }
        return;
      }
      case "reconnect": {
        const code = text(message.roomCode, 12)?.toUpperCase();
        if (!code) { send(ws, withVersion({ type: "error", code: "INVALID_ROOM_CODE", message: "Your saved room link is invalid." })); return; }
        const result = roomManager.reconnectPlayer(message.sessionId, code, ws);
        if (result.error || !result.room || !result.player) { send(ws, withVersion({ type: "error", code: "RECONNECT_FAILED", message: result.error ?? "Could not restore the match." })); return; }
        connection.sessionId = message.sessionId; connection.playerName = result.player.playerName; connection.roomCode = result.room.code;
        const state = lobbyState(result.room);
        if (legacyClient) { sendRaw(ws, { type: "player_joined", player: lobbyPlayer(result.room, message.sessionId), state: { boardId: result.room.boardId, roomCode: result.room.code, hostId: result.room.hostId, maxPlayers: result.room.maxPlayers, players: state.players, status: result.room.status } }); if (result.room.gameState) sendRaw(ws, { type: "game_started", state: GameEngine.serialize(result.room.gameState) }); }
        send(ws, withVersion({ type: "room_joined", roomCode: result.room.code, playerId: message.sessionId, state }));
        broadcast(result.room.code, withVersion({ type: "player_reconnected", playerId: message.sessionId, state }), ws);
        sendSnapshot(ws, result.room); if (result.room.gameState) send(ws, withVersion({ type: "game_started", state: GameEngine.serialize(result.room.gameState) }));
        scheduleTimer(result.room); return;
      }
      case "ready": {
        if (!room) { send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return; }
        const result = roomManager.setReady(room.code, connection.sessionId, message.ready); if (result.error || !result.room) { send(ws, withVersion({ type: "error", code: "READY_FAILED", message: result.error ?? "Could not update ready state." })); return; }
        broadcastState(result.room); return;
      }
      case "start_game": {
        if (!room) { send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return; }
        if (room.hostId !== connection.sessionId) { send(ws, withVersion({ type: "error", code: "NOT_HOST", message: "Only the host can start the game." })); return; }
        const result = roomManager.startGame(room.code); if (result.error || !result.room?.gameState) { send(ws, withVersion({ type: "error", code: "START_FAILED", message: result.error ?? "Could not start the game." })); return; }
        const state = GameEngine.serialize(result.room.gameState); sendRoom(result.room, withVersion({ type: "game_started", state }));
        if (state.turnDeadline) sendRoom(result.room, withVersion({ type: "timer_started", playerId: state.players[state.currentPlayerIndex].id, turnDeadline: state.turnDeadline, serverNow: state.serverNow, sequenceNumber: state.sequenceNumber }));
        scheduleTimer(result.room); return;
      }
      case "make_move": {
        if (!room) { send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return; }
        const now = Date.now(); connection.moveTimestamps = connection.moveTimestamps.filter((time) => now - time < 1000);
        if (connection.moveTimestamps.length >= config.maxMovesPerSecond) { send(ws, withVersion({ type: "error", code: "RATE_LIMITED", message: "Too many moves. Slow down." })); return; }
        connection.moveTimestamps.push(now);
        const expiry = roomManager.expireTurn(room.code);
        if (expiry.changed && expiry.room && expiry.expiredPlayerId) sendRoom(expiry.room, withVersion({ type: "timer_expired", playerId: expiry.expiredPlayerId, state: GameEngine.serialize(expiry.room.gameState!) }));
        const result = roomManager.makeMove(room.code, connection.sessionId, message.edgeId, message.sequenceNumber);
        if (result.error || !result.room?.gameState) { send(ws, withVersion({ type: "move_rejected", reason: result.error ?? "Move rejected.", sequenceNumber: result.room?.gameState?.sequenceNumber ?? 0, requestId: message.requestId })); scheduleTimer(room); return; }
        const state = GameEngine.serialize(result.room.gameState);
        sendRoom(result.room, withVersion({ type: "move_accepted", playerId: connection.sessionId, edgeId: message.edgeId, state, requestId: message.requestId }));
        sendRoom(result.room, withVersion({ type: "turn_changed", playerId: state.players[state.currentPlayerIndex].id, turnDeadline: state.turnDeadline, serverNow: state.serverNow, sequenceNumber: state.sequenceNumber }));
        if (state.status === "completed") sendRoom(result.room, withVersion({ type: "game_over", results: GameEngine.getGameResult(result.room.gameState), state }));
        scheduleTimer(result.room); return;
      }
      case "request_state": if (room) sendSnapshot(ws, room); else send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return;
      case "send_chat": {
        if (!room) { send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return; }
        const messageText = text(message.message, 250); const now = Date.now(); connection.chatTimestamps = connection.chatTimestamps.filter((time) => now - time < 2000);
        if (!messageText) { send(ws, withVersion({ type: "error", code: "INVALID_CHAT", message: "Message cannot be empty." })); return; }
        if (connection.chatTimestamps.length >= 5) { send(ws, withVersion({ type: "error", code: "RATE_LIMITED", message: "Chat is rate limited. Try again shortly." })); return; }
        connection.chatTimestamps.push(now); sendRoom(room, withVersion({ type: "chat_message", playerId: connection.sessionId, playerName: connection.playerName, message: messageText, timestamp: now, messageId: message.requestId })); return;
      }
      case "rematch": {
        if (!room) { send(ws, withVersion({ type: "error", code: "NOT_IN_ROOM", message: "Join a room first." })); return; }
        const result = roomManager.requestRematch(room.code, connection.sessionId); if (result.error || !result.room?.gameState) { send(ws, withVersion({ type: "error", code: "REMATCH_FAILED", message: result.error ?? "Could not start a rematch." })); return; }
        if (result.room.status === "playing") { const state = GameEngine.serialize(result.room.gameState); sendRoom(result.room, withVersion({ type: "rematch_started", state })); scheduleTimer(result.room); }
        else broadcastState(result.room); return;
      }
      case "leave_room": {
        if (!connection.roomCode) return;
        const leftRoom = roomManager.removePlayer(connection.sessionId); connection.roomCode = null;
        if (leftRoom) { sendRoom(leftRoom, withVersion({ type: "player_left", playerId: connection.sessionId, state: lobbyState(leftRoom) })); broadcastState(leftRoom); }
        return;
      }
    }
  };

  wss.on("upgrade", (req: IncomingMessage, socket: import("net").Socket, head: Buffer) => wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req)));
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const ip = (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0] : undefined)?.trim() || req.socket.remoteAddress || "unknown";
    const connection: ConnectionState = { sessionId: `anonymous-${randomUUID()}`, playerName: "Player", roomCode: null, lastActivity: Date.now(), moveTimestamps: [], chatTimestamps: [] };
    connections.set(ws, connection);
    ws.on("message", (data: import("ws").RawData) => { try { handleMessage(ws, connection, JSON.parse(data.toString()), ip); } catch { send(ws, withVersion({ type: "error", code: "INVALID_MESSAGE", message: "Invalid JSON message." })); } });
    ws.on("close", () => { if (connection.roomCode) { const room = roomManager.disconnectPlayer(connection.sessionId); if (room) { sendRoom(room, withVersion({ type: "player_disconnected", playerId: connection.sessionId, state: lobbyState(room) })); broadcastState(room); } } connections.delete(ws); });
    ws.on("pong", () => { connection.lastActivity = Date.now(); });
  });

  const heartbeat = setInterval(() => { for (const ws of wss.clients) { const state = connections.get(ws); if (!state) continue; if (Date.now() - state.lastActivity > config.heartbeatTimeoutMs) ws.terminate(); else ws.ping(); } }, config.heartbeatIntervalMs);
  const cleanup = setInterval(() => roomManager.cleanup(), 60_000);
  wss.on("close", () => { clearInterval(heartbeat); clearInterval(cleanup); for (const handle of timerHandles.values()) clearTimeout(handle); timerHandles.clear(); });
  return wss;
}
