/**
 * ELO rating system.
 *
 * K-factor determines how much ratings change per game.
 * Higher K = more volatile ratings (good for new players).
 * Lower K = more stable ratings (good for established players).
 */

const DEFAULT_RATING = 1000;

export interface PlayerRating {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

export function createRating(): PlayerRating {
  return {
    rating: DEFAULT_RATING,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    peak: DEFAULT_RATING,
  };
}

/**
 * Calculate expected score for player A against player B.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update ratings after a game.
 *
 * @param ratings - Map of player ID to their current rating
 * @param scores - Map of player ID to their game score (cells captured)
 * @param K - K-factor (default 32)
 * @returns Updated ratings
 */
export function updateRatings(
  ratings: Map<string, PlayerRating>,
  scores: Map<string, number>,
  K: number = DEFAULT_RATING,
): Map<string, PlayerRating> {
  const playerIds = Array.from(scores.keys());

  // Determine winner(s) based on score
  const maxScore = Math.max(...Array.from(scores.values()));
  const winners = playerIds.filter((id) => scores.get(id) === maxScore);


  const updated = new Map<string, PlayerRating>();

  for (const playerId of playerIds) {
    const current = ratings.get(playerId) || createRating();
    const isWinner = winners.includes(playerId);

    // Calculate average expected score against all opponents
    let avgExpected = 0;
    let opponentCount = 0;

    for (const opponentId of playerIds) {
      if (opponentId === playerId) continue;
      const opponentRating = ratings.get(opponentId)?.rating || DEFAULT_RATING;
      avgExpected += expectedScore(current.rating, opponentRating);
      opponentCount++;
    }

    if (opponentCount > 0) {
      avgExpected /= opponentCount;
    }

    // Actual score: 1 for win, 0.5 for draw, 0 for loss
    let actualScore: number;
    if (winners.length > 1 && isWinner) {
      actualScore = 0.5; // Draw among top scorers
    } else if (isWinner) {
      actualScore = 1;
    } else {
      actualScore = 0;
    }

    // Calculate new rating
    const ratingChange = Math.round(K * (actualScore - avgExpected));
    const newRating = Math.max(100, current.rating + ratingChange);

    updated.set(playerId, {
      rating: newRating,
      gamesPlayed: current.gamesPlayed + 1,
      wins: current.wins + (isWinner && winners.length === 1 ? 1 : 0),
      losses: current.losses + (!isWinner ? 1 : 0),
      draws: current.draws + (winners.length > 1 && isWinner ? 1 : 0),
      peak: Math.max(current.peak, newRating),
    });
  }

  return updated;
}

/**
 * Get rank tier from rating.
 */
export function getRankTier(rating: number): string {
  if (rating >= 2000) return "Diamond";
  if (rating >= 1600) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
}
