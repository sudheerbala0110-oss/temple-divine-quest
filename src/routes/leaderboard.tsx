import { supabase } from "../integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  School,
  Sparkles,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { NIAT_COLLEGES } from "../lib/niat-colleges";
import { useProfile } from "../context/profileContext";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardRoute,
});

type SortMetric = "xp" | "totalScore" | "bestScore";

interface LeaderboardEntry {
  id: string;
  name: string;
  college: string;
  xp: number;
  totalScore: number;
  bestScore: number;
  isCurrentUser?: boolean;
  rank?: number;
}

const DEMO_PLAYERS: LeaderboardEntry[] = [];

function LeaderboardRoute() {
  const profileContext = useProfile() as any;
  const profile = profileContext?.profile ?? profileContext;
  const [activeTab, setActiveTab] = useState<"global" | "college">("global");
  const [sortBy, setSortBy] = useState<SortMetric>("xp");
  const [selectedCollege, setSelectedCollege] = useState<string>(
    profile?.selected_college_name ||
      profile?.college ||
      profile?.selected_college ||
      NIAT_COLLEGES[2]?.name ||
      NIAT_COLLEGES[0]?.name ||
      ""
  );

  const [dbPlayers, setDbPlayers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from("player_profiles")
        .select("*");

      if (data && !error) {
        console.log("Database player rows:", data);

        const mapped: LeaderboardEntry[] = data.map((p: any) => {
          // Check all possible schema field names for the player's college
          const detectedCollege =
            p.selected_college_name ||
            p.college_name ||
            p.selected_college ||
            p.college ||
            p.collegeName ||
            "General";

          return {
            id: p.id || p.player_key,
            name: p.player_name?.trim() || "Devotee",
            college: detectedCollege,
            xp: Number(p.xp ?? 0),
            totalScore: Number(p.best_score ?? p.total_score ?? 0),
            bestScore: Number(p.best_score ?? 0),
            isCurrentUser:
              p.player_key === profile?.player_key || p.id === profile?.id,
          };
        });

        setDbPlayers(mapped);
      }
    }

    fetchLeaderboard();
  }, [profile]);

  const currentLeaderboardData = useMemo(() => {
    const list = [...dbPlayers];

    list.sort((a: any, b: any) => {
      const valA = (a[sortBy] as number) ?? 0;
      const valB = (b[sortBy] as number) ?? 0;
      return valB - valA;
    });

    return list.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [dbPlayers, sortBy]);

  // College-filtered view with tolerant matching
  const collegeLeaderboardData = useMemo(() => {
    const cleanTarget = (selectedCollege || "")
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, "")
      .trim();

    const filtered = currentLeaderboardData.filter((entry) => {
      const entryCol = (entry.college || "")
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, "")
        .trim();

      if (!entryCol || entryCol === "general") return false;

      return entryCol.includes(cleanTarget) || cleanTarget.includes(entryCol);
    });

    return filtered.map((player, idx) => ({
      ...player,
      rank: idx + 1,
    }));
  }, [currentLeaderboardData, selectedCollege]);

  const displayedList =
    activeTab === "global" ? currentLeaderboardData : collegeLeaderboardData;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-5 h-5 text-amber-400 inline" />;
    }
    if (rank === 2) {
      return <Medal className="w-5 h-5 text-slate-300 inline" />;
    }
    if (rank === 3) {
      return <Award className="w-5 h-5 text-amber-600 inline" />;
    }
    return (
      <span className="text-muted-foreground font-mono font-bold">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" /> Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Track temple rankings across verified NIAT partner colleges.
          </p>
        </div>

        {/* Tab & Metric Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-card border border-border/60 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("global")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === "global"
                  ? "bg-amber-400 text-black shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Global Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("college")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === "college"
                  ? "bg-amber-400 text-black shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My College Rank
            </button>
          </div>

          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setSortBy("xp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                sortBy === "xp"
                  ? "bg-cyan-500 text-black font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              XP
            </button>
            <button
              onClick={() => setSortBy("totalScore")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                sortBy === "totalScore"
                  ? "bg-cyan-500 text-black font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Total Score
            </button>
            <button
              onClick={() => setSortBy("bestScore")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                sortBy === "bestScore"
                  ? "bg-cyan-500 text-black font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Best Game Score
            </button>
          </div>
        </div>

        {/* College Dropdown Filter */}
        {activeTab === "college" && (
          <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <School className="w-5 h-5 text-amber-400" />
              <span>Selected College:</span>
            </div>
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full sm:w-auto bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              {NIAT_COLLEGES.map((c: any) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.location})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 px-4 py-3 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="col-span-2 sm:col-span-1 text-center">Rank</span>
            <span className="col-span-5 sm:col-span-4">Player Name</span>
            <span className="hidden sm:block sm:col-span-4">College</span>
            <span className="col-span-5 sm:col-span-3 text-right">
              {sortBy === "xp"
                ? "XP"
                : sortBy === "totalScore"
                ? "Total Score"
                : "Best Score"}
            </span>
          </div>

          <div className="divide-y divide-border/20">
            {displayedList.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No scores registered for this view yet.
              </div>
            ) : (
              displayedList.map((player) => (
                <div
                  key={player.id}
                  className={`grid grid-cols-12 px-4 py-3.5 items-center text-sm transition-colors ${
                    player.isCurrentUser
                      ? "bg-amber-400/10 font-bold"
                      : "hover:bg-accent/40"
                  }`}
                >
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    {getRankBadge(player.rank || 1)}
                  </div>
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2 truncate">
                    <span className="truncate">{player.name}</span>
                    {player.isCurrentUser && (
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block sm:col-span-4 text-muted-foreground text-xs truncate">
                    {player.college}
                  </div>
                  <div className="col-span-5 sm:col-span-3 text-right font-mono font-bold text-amber-400">
                    {sortBy === "xp"
                      ? player.xp.toLocaleString()
                      : sortBy === "totalScore"
                      ? player.totalScore.toLocaleString()
                      : player.bestScore.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}