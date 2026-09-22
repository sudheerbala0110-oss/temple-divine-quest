export type AchievementDefinition = {
  id: string;
  title: string;
  detail: string;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "path-chosen", title: "Path Chosen", detail: "Join a college realm" },
  { id: "first-quest", title: "First Quest", detail: "Complete your first game" },
  { id: "high-score-hunter", title: "High Score Hunter", detail: "Beat your previous best score" },
  { id: "combo-master", title: "Combo Master", detail: "Reach a 10x combo" },
  { id: "perfect-round", title: "Perfect Round", detail: "Finish a round without mistakes" },
  { id: "game-explorer", title: "Game Explorer", detail: "Play every game in the hub" },
  { id: "divine-champion", title: "Divine Champion", detail: "Complete every game in the hub" },
];

export function findAchievement(id: string) {
  return ACHIEVEMENTS.find((item) => item.id === id);
}
