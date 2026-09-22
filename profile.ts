export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface GameResult {
  gameId: string;
  score: number;
  maxCombo: number;
  hasMistakes: boolean;
  xpEarned: number;
  coinsEarned: number;
}

export interface UserProfile {
  id?: string;
  xp: number;
  coins: number;
  gamesCompletedCount: number;
  playedGameIds: string[];
  completedGameIds: string[];
  bestScores: Record<string, number>;
  unlockedAchievements: string[];
}

export const ALL_GAMES = ['game-1', 'game-2', 'game-3', 'game-4', 'game-5'];

export const ACHIEVEMENTS: Record<string, Achievement> = {
  FIRST_QUEST: {
    id: 'FIRST_QUEST',
    title: 'FIRST QUEST',
    description: 'Complete your first game.',
    icon: '⚔️'
  },
  HIGH_SCORE_HUNTER: {
    id: 'HIGH_SCORE_HUNTER',
    title: 'HIGH SCORE HUNTER',
    description: 'Beat your previous best score.',
    icon: '🎯'
  },
  COMBO_MASTER: {
    id: 'COMBO_MASTER',
    title: 'COMBO MASTER',
    description: 'Reach a 10x combo.',
    icon: '⚡'
  },
  PERFECT_ROUND: {
    id: 'PERFECT_ROUND',
    title: 'PERFECT ROUND',
    description: 'Complete a round without mistakes.',
    icon: '✨'
  },
  GAME_EXPLORER: {
    id: 'GAME_EXPLORER',
    title: 'GAME EXPLORER',
    description: 'Play all five games.',
    icon: '🧭'
  },
  DIVINE_CHAMPION: {
    id: 'DIVINE_CHAMPION',
    title: 'DIVINE CHAMPION',
    description: 'Complete all five games.',
    icon: '👑'
  }
};