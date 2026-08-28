export function getRankTier(rating: number): string {
  if (rating >= 2000) return "Diamond";
  if (rating >= 1600) return "Platinum";
  if (rating >= 1300) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
}

export function getRankColor(rating: number): string {
  if (rating >= 2000) return "#b9f2ff";
  if (rating >= 1600) return "#e0d4ff";
  if (rating >= 1300) return "#ffd700";
  if (rating >= 1100) return "#c0c0c0";
  return "#cd7f32";
}
