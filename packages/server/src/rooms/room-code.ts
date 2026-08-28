import { config } from "../config.js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion

/**
 * Generate a random room code.
 * Uses characters that are easy to read and type.
 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < config.roomCodeLength; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
