import { describe, it, expect } from "vitest";
import { RoomManager } from "../rooms/room-manager.js";

const dummyBoard = {
  id: "test",
  name: "Test Board",
  width: 2,
  height: 2,
  cells: []
} as any as import("@dots-game/shared").BoardDefinition;

describe("RoomManager", () => {
  it("should create a room and join it", () => {
    const manager = new RoomManager();
    const { room, error } = manager.createRoom("test", dummyBoard, "p1", "Player 1", 2, "127.0.0.1");
    
    expect(error).toBeUndefined();
    expect(room).toBeDefined();
    expect(room.ip).toBe("127.0.0.1");
    expect(room.players.has("p1")).toBe(true);
    expect(room.ratings.has("p1")).toBe(true);

    const ws = {} as any;
    const { room: joinedRoom } = manager.joinRoom(room.code, "p2", "Player 2", ws);
    expect(joinedRoom).toBeDefined();
    expect(joinedRoom.players.has("p2")).toBe(true);
    expect(joinedRoom.ratings.has("p2")).toBe(true);
  });

  it("should track ipRoomCount and decrement it on cleanup and removal", () => {
    const manager = new RoomManager();
    manager.createRoom("test", dummyBoard, "p1", "Player 1", 2, "127.0.0.1");
    
    expect((manager as any).ipRoomCount.get("127.0.0.1")).toBe(1);

    manager.removePlayer("p1");
    expect((manager as any).ipRoomCount.get("127.0.0.1")).toBeUndefined();
  });
});
