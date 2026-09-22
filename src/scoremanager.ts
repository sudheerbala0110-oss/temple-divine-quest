export const XP_STORAGE_KEY = 'user_xp';

/**
 * Call this function whenever a game finishes to add XP to the user.
 */
export function addGameScore(pointsEarned: number): number {
  const currentXp = Number(localStorage.getItem(XP_STORAGE_KEY) || '0');
  const newXp = currentXp + pointsEarned;
  
  localStorage.setItem(XP_STORAGE_KEY, newXp.toString());

  // Broadcast event so Profile and Leaderboard update immediately
  window.dispatchEvent(new Event('score-updated'));
  return newXp;
}

/**
 * Helper to fetch the current saved XP.
 */
export function getSavedXp(): number {
  return Number(localStorage.getItem(XP_STORAGE_KEY) || '0');
}