export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",

  // Room settings
  roomCodeLength: 6,
  roomExpiryMs: 10 * 60 * 1000, // 10 minutes of inactivity
  maxRooms: 1000,

  // Player settings
  maxPlayersPerRoom: 4,
  playerTimeoutMs: 2 * 60 * 1000, // 2 minutes before seat is released

  // Rate limiting
  maxMovesPerSecond: 10,
  maxRoomsPerIp: 5,

  // WebSocket
  heartbeatIntervalMs: 15_000,
  heartbeatTimeoutMs: 30_000,
};
