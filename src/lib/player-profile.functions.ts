import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { NIAT_COLLEGES } from "@/lib/niat-colleges";

const playerKeySchema = z.string().uuid();
const selectionSchema = z.object({
  playerKey: playerKeySchema,
  collegeName: z.string().min(1).max(160),
  collegeLocation: z.string().min(1).max(100),
});

const nameSchema = z.object({
  playerKey: playerKeySchema,
  playerName: z.string().trim().min(1).max(40),
});

export type PlayerProfile = {
  achievements: unknown;
  best_score: number;
  coins: number;
  completed_games: number;
  current_streak: number;
  level: number;
  player_name: string;
  selected_college_location: string;
  selected_college_name: string;
  xp: number;
};

export const getPlayerProfile = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ playerKey: playerKeySchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("player_profiles")
      .select("player_name, selected_college_name, selected_college_location, level, xp, coins, current_streak, best_score, completed_games, achievements")
      .eq("player_key", data.playerKey)
      .maybeSingle();
    if (error) throw new Error("Unable to load the player profile.");
    return profile;
  });

export const savePlayerName = createServerFn({ method: "POST" })
  .inputValidator((data) => nameSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("player_profiles")
      .update({ player_name: data.playerName, updated_at: new Date().toISOString() })
      .eq("player_key", data.playerKey)
      .select("player_name")
      .single();
    if (error) throw new Error("Unable to save your player name.");
    return { playerName: profile.player_name };
  });

export const savePlayerCollege = createServerFn({ method: "POST" })
  .inputValidator((data) => selectionSchema.parse(data))
  .handler(async ({ data }) => {
    const verified = NIAT_COLLEGES.some(
      (college) => college.name === data.collegeName && college.location === data.collegeLocation,
    );
    if (!verified) throw new Error("Please choose an officially verified NIAT institution.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("player_profiles").upsert(
      {
        player_key: data.playerKey,
        selected_college_name: data.collegeName,
        selected_college_location: data.collegeLocation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_key" },
    );
    if (error) throw new Error("Unable to save your college. Please try again.");
    return { collegeName: data.collegeName, collegeLocation: data.collegeLocation };
  });