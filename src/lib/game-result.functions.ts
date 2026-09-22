import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const GAME_IDS = ["temple-run", "divine-aim", "color-chakra", "ganesh-rhythm"] as const;
export type GameId = (typeof GAME_IDS)[number];

const resultSchema = z.object({
  playerKey: z.string().uuid(),
  gameId: z.enum(GAME_IDS),
  score: z.number().int().min(0).max(1_000_000),
  coins: z.number().int().min(0).max(100_000),
  xp: z.number().int().min(0).max(100_000),
  stars: z.number().int().min(0).max(100_000),
  bestCombo: z.number().int().min(0).max(10_000).optional(),
  completed: z.boolean().optional(),
  perfectRound: z.boolean().optional(),
});

export type GameStatEntry = { plays: number; completions: number; best: number };
export type GameStats = Partial<Record<GameId, GameStatEntry>>;

export type GameResultSummary = {
  score: number;
  bestScore: number;
  bestImproved: boolean;
  xp: number;
  level: number;
  coins: number;
  completedGames: number;
  unlocked: string[];
};

function readStats(value: unknown): GameStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: GameStats = {};
  for (const id of GAME_IDS) {
    const entry = (value as Record<string, unknown>)[id];
    if (entry && typeof entry === "object") {
      const row = entry as Record<string, unknown>;
      out[id] = {
        plays: typeof row["plays"] === "number" ? row["plays"] : 0,
        completions: typeof row["completions"] === "number" ? row["completions"] : 0,
        best: typeof row["best"] === "number" ? row["best"] : 0,
      };
    }
  }
  return out;
}

export const submitGameResult = createServerFn({ method: "POST" })
  .inputValidator((data) => resultSchema.parse(data))
  .handler(async ({ data }): Promise<GameResultSummary> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const columns = "xp, coins, level, best_score, completed_games, achievements, game_stats";

    const { data: existingProfile, error: loadError } = await supabaseAdmin
      .from("player_profiles")
      .select(columns)
      .eq("player_key", data.playerKey)
      .maybeSingle();

    if (loadError) throw new Error("Unable to load your player profile.");

    let profile = existingProfile;

    // First run before a college was picked: create the profile on the fly.
    if (!profile) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("player_profiles")
        .insert({
          player_key: data.playerKey,
          selected_college_name: "Not selected yet",
          selected_college_location: "—",
        })
        .select(columns)
        .single();

      if (createError || !created) throw new Error("Unable to create your player profile.");
      profile = created;
    }

    const previousBest = profile.best_score;
    const nextXp = profile.xp + data.xp;
    const nextLevel = Math.max(1, Math.floor(nextXp / 1000) + 1);
    const nextCoins = profile.coins + data.coins;
    const bestScore = Math.max(previousBest, data.score);
    const bestImproved = data.score > previousBest && data.score > 0;
    const completedGames = profile.completed_games + 1;

    const stats = readStats(profile.game_stats);
    const entry = stats[data.gameId] ?? { plays: 0, completions: 0, best: 0 };
    stats[data.gameId] = {
      plays: entry.plays + 1,
      completions: entry.completions + (data.completed ? 1 : 0),
      best: Math.max(entry.best, data.score),
    };

    const existing = Array.isArray(profile.achievements)
      ? profile.achievements.filter((item): item is string => typeof item === "string")
      : [];
    const before = new Set(existing);
    const unlocked = new Set(existing);

    unlocked.add("first-quest");
    unlocked.add("first-victory");
    if (bestImproved && previousBest > 0) unlocked.add("high-score-hunter");
    if ((data.bestCombo ?? 0) >= 10) unlocked.add("combo-master");
    if (data.perfectRound) unlocked.add("perfect-round");
    if (bestScore >= 100) unlocked.add("century-score");
    if (GAME_IDS.every((id) => (stats[id]?.plays ?? 0) > 0)) unlocked.add("game-explorer");
    if (GAME_IDS.every((id) => (stats[id]?.completions ?? 0) > 0)) unlocked.add("divine-champion");

    const { error: saveError } = await supabaseAdmin
      .from("player_profiles")
      .update({
        xp: nextXp,
        level: nextLevel,
        coins: nextCoins,
        best_score: bestScore,
        completed_games: completedGames,
        achievements: Array.from(unlocked),
        game_stats: stats,
        updated_at: new Date().toISOString(),
      })
      .eq("player_key", data.playerKey);

    if (saveError) throw new Error("Unable to save your run.");

    return {
      score: data.score,
      bestScore,
      bestImproved,
      xp: data.xp,
      level: nextLevel,
      coins: data.coins,
      completedGames,
      unlocked: Array.from(unlocked).filter((id) => !before.has(id)),
    };
  });
