export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",

  // Room settings
  roomCodeLength: 6,
  roomExpiryMs: 60 * 60 * 1000,
  maxRooms: 1000,

  // Player settings
  maxPlayersPerRoom: 4,
  playerTimeoutMs: 15 * 60 * 1000,

  // Rate limiting
  maxMovesPerSecond: 10,
  maxRoomsPerIp: 5,

  // WebSocket
  heartbeatIntervalMs: 15_000,
  heartbeatTimeoutMs: 30_000,
};
