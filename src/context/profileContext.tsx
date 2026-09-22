import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ==========================================
// 1. Types & Interfaces
// ==========================================
export interface GameResult {
  gameId: string;
  score: number;
  completed?: boolean;
  accuracy?: number;
  [key: string]: any;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked?: boolean;
  [key: string]: any;
}

export interface UserProfile {
  totalScore: number;
  gamesPlayed: number;
  unlockedAchievements: string[];
  recentScores: Record<string, number>;
  [key: string]: any;
}

export interface ProfileContextType {
  profile: UserProfile;
  activeAchievement: Achievement | null;
  clearAchievement: () => void;
  recordGameResult: (result: GameResult) => void;
  unlockAchievement: (id: string) => void;
}

// ==========================================
// 2. Constants
// ==========================================
export const ALL_GAMES: string[] = [
  'color-chakra',
  'divine-aim',
  'ganesh-rhythm',
  'temple-run'
];

export const ACHIEVEMENTS: Record<string, Achievement> = {
  'first-quest': {
    id: 'first-quest',
    title: 'First Quest',
    description: 'Started your first quest'
  },
  'first-victory': {
    id: 'first-victory',
    title: 'First Victory',
    description: 'Won your first game'
  },
  'high-score-hunter': {
    id: 'high-score-hunter',
    title: 'High Score Hunter',
    description: 'Achieved a high score'
  },
  'combo-master': {
    id: 'combo-master',
    title: 'Combo Master',
    description: 'Reached a combo streak'
  },
  'perfect-round': {
    id: 'perfect-round',
    title: 'Flawless Aim',
    description: 'Completed a round without missing'
  },
  'century-score': {
    id: 'century-score',
    title: 'Century Scorer',
    description: 'Scored 100 points'
  },
  'game-explorer': {
    id: 'game-explorer',
    title: 'Temple Explorer',
    description: 'Played all mini-games'
  },
  'divine-champion': {
    id: 'divine-champion',
    title: 'Divine Champion',
    description: 'Mastered the temple'
  }
};

const DEFAULT_PROFILE: UserProfile = {
  totalScore: 0,
  gamesPlayed: 0,
  unlockedAchievements: [],
  recentScores: {}
};

// ==========================================
// 3. Context Creation
// ==========================================
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// ==========================================
// 4. Provider Component
// ==========================================
export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('temple_quest_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('temple_quest_profile', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to persist profile', e);
    }
  }, [profile]);

  const clearAchievement = () => {
    setActiveAchievement(null);
  };

  const unlockAchievement = (id: string) => {
    const item = ACHIEVEMENTS[id];
    if (!item) return;

    setProfile((prev: UserProfile) => {
      if (prev.unlockedAchievements.includes(id)) {
        return prev;
      }
      setActiveAchievement(item);
      return {
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, id]
      };
    });
  };

  const recordGameResult = (result: GameResult) => {
    setProfile((prev: UserProfile) => {
      const updatedTotalScore = (prev.totalScore || 0) + (result.score || 0);
      const updatedGamesPlayed = (prev.gamesPlayed || 0) + 1;
      const updatedScores = {
        ...prev.recentScores,
        [result.gameId]: result.score
      };

      // Check first-quest achievement
      if (updatedGamesPlayed === 1 && !prev.unlockedAchievements.includes('first-quest')) {
        unlockAchievement('first-quest');
      }

      // Check century-score achievement
      if (result.score >= 100 && !prev.unlockedAchievements.includes('century-score')) {
        unlockAchievement('century-score');
      }

      // Check game-explorer achievement
      const playedAll = ALL_GAMES.every((gid: string) => updatedScores[gid] !== undefined);
      if (playedAll && !prev.unlockedAchievements.includes('game-explorer')) {
        unlockAchievement('game-explorer');
      }

      return {
        ...prev,
        totalScore: updatedTotalScore,
        gamesPlayed: updatedGamesPlayed,
        recentScores: updatedScores
      };
    });
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        activeAchievement,
        clearAchievement,
        recordGameResult,
        unlockAchievement
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

// ==========================================
// 5. Custom Hook
// ==========================================
export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export default ProfileContext;