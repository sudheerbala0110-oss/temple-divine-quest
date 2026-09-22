import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Check, Coins, Flame, Gamepad2, LoaderCircle, MapPin, Pencil, Save, ShieldCheck, Sparkles, Star, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import templeImage from "@/assets/ganesha-temple.jpg";
import { GameNavigation } from "@/components/game-navigation";
import { Button } from "@/components/ui/button";
import { getPlayerProfile, savePlayerName, type PlayerProfile } from "@/lib/player-profile.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Player Profile | Ganesha: The Divine Quest" },
      { name: "description", content: "View your Divine Quest player level, XP, streak, scores, coins, and achievements." },
      { property: "og:title", content: "Player Profile | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Track your journey, progress, and divine achievements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerProfilePage,
});

const achievementCatalog = [
  { id: "path-chosen", title: "Path Chosen", detail: "Join a college realm", icon: MapPin },
  { id: "first-victory", title: "First Victory", detail: "Complete your first game", icon: Trophy },
  { id: "wisdom-streak", title: "Wisdom Streak", detail: "Reach a 7-day streak", icon: Flame },
  { id: "century-score", title: "Divine Century", detail: "Score 100 points", icon: Star },
];

function PlayerProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const playerKey = window.localStorage.getItem("ganesha-player-key");
    if (!playerKey) {
      setIsLoading(false);
      return;
    }
    getPlayerProfile({ data: { playerKey } })
      .then((loaded) => {
        setProfile(loaded);
        setName(loaded?.player_name ?? "");
      })
      .catch(() => setError("Your profile could not be summoned. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const unlocked = useMemo(() => {
    const stored = Array.isArray(profile?.achievements) ? profile.achievements.filter((item): item is string => typeof item === "string") : [];
    return new Set([...(profile ? ["path-chosen"] : []), ...stored]);
  }, [profile]);

  async function saveName() {
    const playerKey = window.localStorage.getItem("ganesha-player-key");
    const cleanName = name.trim();
    if (!playerKey || !cleanName || !profile) return;
    setIsSaving(true);
    setError("");
    try {
      const result = await savePlayerName({ data: { playerKey, playerName: cleanName } });
      setProfile({ ...profile, player_name: result.playerName });
      setName(result.playerName);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your name.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="profile-loading"><LoaderCircle className="size-7 animate-spin text-primary" /><span>Summoning your profile</span></main>;
  }

  if (!profile) {
    return (
      <main className="profile-loading">
        <ShieldCheck className="size-10 text-primary" />
        <h1 className="font-display text-3xl">Choose Your Path First</h1>
        <p className="text-muted-foreground">Select your college to create your Divine Quest profile.</p>
        <Button asChild><Link to="/choose-college">Choose College</Link></Button>
      </main>
    );
  }

  const xpGoal = Math.max(1000, profile.level * 1000);
  const xpPercent = Math.min(100, Math.round((profile.xp / xpGoal) * 100));
  const stats = [
    { label: "Coins", value: profile.coins.toLocaleString(), icon: Coins },
    { label: "Current streak", value: `${profile.current_streak} days`, icon: Flame },
    { label: "Best score", value: profile.best_score.toLocaleString(), icon: Target },
    { label: "Completed games", value: profile.completed_games.toLocaleString(), icon: Gamepad2 },
  ];

  return (
    <main className="profile-screen min-h-svh bg-background text-foreground">
      <img src={templeImage} alt="Ancient temple glowing behind the player profile" className="quest-background" width={1920} height={1200} />
      <div className="profile-veil" />
      <div className="energy-grid" aria-hidden="true" />
      <div className="particle-field" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 pt-5 sm:px-8 sm:pb-12">
        <GameNavigation />

        <header className="profile-header animate-rise">
          <div className="profile-avatar"><Sparkles aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <p className="game-kicker">Divine seeker · Level {profile.level}</p>
            {isEditing ? (
              <div className="profile-name-editor">
                <input aria-label="Player name" value={name} maxLength={40} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveName(); }} />
                <Button type="button" size="icon" aria-label="Save player name" onClick={() => void saveName()} disabled={isSaving || !name.trim()}>{isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate font-display text-3xl font-semibold sm:text-5xl">{profile.player_name}</h1>
                <Button type="button" variant="ghost" size="icon" aria-label="Edit player name" onClick={() => setIsEditing(true)}><Pencil /></Button>
              </div>
            )}
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{profile.selected_college_name} · {profile.selected_college_location}</p>
          </div>
          <div className="level-emblem"><span>{profile.level}</span><small>Level</small></div>
        </header>

        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

        <section className="xp-panel animate-rise" aria-label="Experience progress">
          <div className="flex items-end justify-between gap-4">
            <div><p className="game-kicker">Wisdom gained</p><h2 className="mt-1 font-display text-xl">XP Progress</h2></div>
            <p className="font-display text-sm text-primary"><strong className="text-xl">{profile.xp.toLocaleString()}</strong> / {xpGoal.toLocaleString()} XP</p>
          </div>
          <div className="xp-track" role="progressbar" aria-valuemin={0} aria-valuemax={xpGoal} aria-valuenow={profile.xp}><span style={{ width: `${xpPercent}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Level {profile.level}</span><span>{xpGoal - profile.xp} XP to next level</span></div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Player statistics">
          {stats.map(({ label, value, icon: Icon }, index) => (
            <article className="stat-card animate-rise" style={{ animationDelay: `${index * 70}ms` }} key={label}>
              <Icon aria-hidden="true" /><p>{label}</p><strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="game-kicker">Sacred milestones</p><h2 className="mt-1 font-display text-2xl">Achievements</h2></div>
            <p className="text-sm text-muted-foreground">{unlocked.size} / {achievementCatalog.length} unlocked</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {achievementCatalog.map(({ id, title, detail, icon: Icon }, index) => {
              const isUnlocked = unlocked.has(id);
              return (
                <article className={`achievement-card animate-rise ${isUnlocked ? "achievement-unlocked" : "achievement-locked"}`} style={{ animationDelay: `${160 + index * 70}ms` }} key={id}>
                  <span className="achievement-icon">{isUnlocked ? <Check /> : <Icon />}</span>
                  <div><h3 className="font-display font-semibold">{title}</h3><p>{detail}</p></div>
                  {isUnlocked && <Award className="achievement-mark" aria-label="Unlocked" />}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}