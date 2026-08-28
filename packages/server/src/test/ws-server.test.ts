import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock ws module
vi.mock("ws", () => {
  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    readyState = 1;
    send = vi.fn();
    terminate = vi.fn();
    ping = vi.fn();
    listeners = new Map<string, Function[]>();
    
    on(event: string, cb: Function) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push(cb);
    }
    
    emit(event: string, ...args: any[]) {
      const cbs = this.listeners.get(event) || [];
      cbs.forEach(cb => cb(...args));
    }
    
    listenerCount(event: string) {
      return (this.listeners.get(event) || []).length;
    }
  }

  class MockWebSocketServer {
    clients = new Set<MockWebSocket>();
    listeners = new Map<string, Function[]>();
    
    on(event: string, cb: Function) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push(cb);
    }
    
    emit(event: string, ...args: any[]) {
      const cbs = this.listeners.get(event) || [];
      cbs.forEach(cb => cb(...args));
    }

    handleUpgrade(_req: any, _socket: any, _head: any, cb: any) {
      const ws = new MockWebSocket();
      this.clients.add(ws);
      cb(ws);
    }

    close(cb?: () => void) {
      this.emit("close");
      if (cb) cb();
    }
  }

  return {
    WebSocketServer: MockWebSocketServer,
    WebSocket: MockWebSocket,
  };
});

import { createWsServer } from "../transport/ws-server";
import { RoomManager } from "../rooms/room-manager";
import { config } from "../config";
import { WebSocket } from "ws";

describe("WebSocket Server", () => {
  let roomManager: RoomManager;
  let wss: any;

  beforeEach(() => {
    vi.useFakeTimers();
    roomManager = new RoomManager();
    wss = createWsServer(roomManager);
  });

  afterEach(() => {
    wss.close();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should handle connection and store connection state", () => {
    const ws = new WebSocket(null as any);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    expect((ws as any).listenerCount("message")).toBeGreaterThan(0);
    expect((ws as any).listenerCount("close")).toBeGreaterThan(0);
    expect((ws as any).listenerCount("pong")).toBeGreaterThan(0);
  });

  it("should handle invalid JSON messages", () => {
    const ws = new WebSocket(null as any);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    (ws as any).emit("message", "invalid-json");
    
    expect((ws as any).send).toHaveBeenCalledWith(
      expect.stringContaining('"code":"INVALID_MESSAGE"')
    );
  });

  it("should handle ping message", () => {
    const ws = new WebSocket(null as any);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    (ws as any).emit("message", JSON.stringify({ type: "ping", timestamp: 123 }));
    
    expect((ws as any).send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"pong","timestamp":123')
    );
  });

  it("should terminate connection on heartbeat timeout", () => {
    const ws = new WebSocket(null as any);
    wss.clients = new Set([ws]);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    // Fast-forward past heartbeat timeout
    vi.advanceTimersByTime(config.heartbeatTimeoutMs + config.heartbeatIntervalMs + 1000);
    
    expect((ws as any).terminate).toHaveBeenCalled();
  });

  it("should keep connection alive with pongs", () => {
    const ws = new WebSocket(null as any);
    wss.clients = new Set([ws]);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    // Advance halfway
    vi.advanceTimersByTime(config.heartbeatIntervalMs);
    expect((ws as any).ping).toHaveBeenCalled();
    
    // Simulate client sending pong
    (ws as any).emit("pong");
    
    // Advance past original timeout, but we had a pong
    vi.advanceTimersByTime(config.heartbeatTimeoutMs);
    
    expect((ws as any).terminate).not.toHaveBeenCalled();
  });

  it("should handle rate limiting on make_move", () => {
    const ws = new WebSocket(null as any);
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    
    wss.emit("connection", ws, req);
    
    // First we need to be in a room
    (ws as any).emit("message", JSON.stringify({ 
      type: "create_game", 
      boardId: "square-3x3", 
      playerName: "Alice", 
      maxPlayers: 2 
    }));

    // Send too many moves quickly
    for (let i = 0; i < config.maxMovesPerSecond + 2; i++) {
      (ws as any).emit("message", JSON.stringify({
        type: "make_move",
        edgeId: "0,0,H",
        sequenceNumber: i
      }));
    }

    expect((ws as any).send).toHaveBeenCalledWith(
      expect.stringContaining('"code":"RATE_LIMITED"')
    );
  });
});
