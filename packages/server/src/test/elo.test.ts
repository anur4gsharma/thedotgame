import { describe, it, expect } from "vitest";
import { updateRatings, createRating } from "../game/elo.js";

describe("elo ratings", () => {
  it("should calculate correctly for 1v1", () => {
    const ratings = new Map();
    ratings.set("p1", createRating());
    ratings.set("p2", createRating());

    const scores = new Map();
    scores.set("p1", 10);
    scores.set("p2", 5);

    const updated = updateRatings(ratings, scores);
    expect(updated.get("p1")?.rating).toBeGreaterThan(1000);
    expect(updated.get("p2")?.rating).toBeLessThan(1000);
  });
});
