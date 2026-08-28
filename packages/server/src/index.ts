import { createServer } from "http";
import { createWsServer } from "./transport/ws-server.js";
import { RoomManager } from "./rooms/room-manager.js";
import { config } from "./config.js";

const roomManager = new RoomManager();

const httpServer = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    const stats = roomManager.getStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ...stats }));
    return;
  }

  // CORS for development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = createWsServer(roomManager);

httpServer.on("upgrade", (req, socket, head) => {
  wss.emit("upgrade", req, socket, head);
});

httpServer.listen(config.port, config.host, () => {
  console.log(`\n  ⚫ Dots server running on ws://${config.host}:${config.port}\n`);
  console.log(`  Health: http://localhost:${config.port}/health\n`);
});
