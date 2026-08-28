import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createWsServer } from "../transport/ws-server";
import { RoomManager } from "../rooms/room-manager";
import { AddressInfo } from "net";

describe("Integration Flow", () => {
  let server: ReturnType<typeof createServer>;
  let wss: WebSocketServer;
  let roomManager: RoomManager;
  let port: number;

  beforeAll(async () => {
    roomManager = new RoomManager();
    server = createServer();
    wss = createWsServer(roomManager);
    
    server.on("upgrade", (req, socket, head) => {
      wss.emit("upgrade", req, socket, head);
    });
    
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    wss.close();
    server.close();
  });

  const messageQueue = new Map<WebSocket, any[]>();
  const waiters = new Map<WebSocket, ((data: any) => void)[]>();

  const connectClient = (): Promise<WebSocket> => {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on("open", () => {
        messageQueue.set(ws, []);
        waiters.set(ws, []);
        ws.on("message", (data) => {
          const msg = JSON.parse(data.toString());
          const w = waiters.get(ws)!;
          if (w.length > 0) {
            w.shift()!(msg);
          } else {
            messageQueue.get(ws)!.push(msg);
          }
        });
        resolve(ws);
      });
    });
  };

  const nextMessage = (ws: WebSocket): Promise<any> => {
    return new Promise((resolve) => {
      const q = messageQueue.get(ws)!;
      if (q.length > 0) {
        resolve(q.shift());
      } else {
        waiters.get(ws)!.push(resolve);
      }
    });
  };

  it("should complete a full game flow", async () => {
    // 1. Create room
    const hostWs = await connectClient();
    
    hostWs.send(JSON.stringify({
      type: "create_game",
      boardId: "square-3x3",
      playerName: "Host",
      maxPlayers: 2,
    }));

    const createRes = await nextMessage(hostWs);
    if (createRes.type !== "game_created") {
      console.log("CREATE RES ERROR:", createRes);
    }
    expect(createRes.type).toBe("game_created");
    expect(createRes.roomCode).toBeDefined();
    
    const roomCode = createRes.roomCode;

    // 2. Join room
    const guestWs = await connectClient();
    guestWs.send(JSON.stringify({
      type: "join_game",
      roomCode,
      playerName: "Guest"
    }));

    // Host should receive player_joined
    const hostJoinMsg = await nextMessage(hostWs);
    expect(hostJoinMsg.type).toBe("player_joined");
    expect(hostJoinMsg.player.name).toBe("Guest");

    // Guest should receive player_joined
    const guestJoinMsg = await nextMessage(guestWs);
    expect(guestJoinMsg.type).toBe("player_joined");
    const guestId = guestJoinMsg.player.id;

    // 3. Start game
    hostWs.send(JSON.stringify({
      type: "start_game"
    }));

    const hostStartRes = await nextMessage(hostWs);
    expect(hostStartRes.type).toBe("game_started");
    
    const guestStartRes = await nextMessage(guestWs);
    expect(guestStartRes.type).toBe("game_started");

    // Reconnection Flow
    guestWs.close();
    
    // Wait a bit for close to register
    await new Promise(r => setTimeout(r, 50));
    
    const reconnectWs = await connectClient();
    reconnectWs.send(JSON.stringify({
      type: "reconnect",
      roomCode,
      playerId: guestId
    }));

    const reconnectRes1 = await nextMessage(reconnectWs);
    expect(reconnectRes1.type).toBe("player_joined");
    
    const reconnectRes2 = await nextMessage(reconnectWs);
    expect(reconnectRes2.type).toBe("game_started");

    // Cleanup
    hostWs.close();
    reconnectWs.close();
  });
});
