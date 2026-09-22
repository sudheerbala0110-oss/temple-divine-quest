import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Coins, LockKeyhole, Play, Sparkles, Star, Target } from "lucide-react";

import templeImage from "@/assets/ganesha-temple.jpg";
import { GameNavigation } from "@/components/game-navigation";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Game Hub | Ganesha: The Divine Quest" },
      { name: "description", content: "Enter the Divine Quest game hub: play Ganesha Temple Run, Divine Aim, Color Chakra and Ganesh Rhythm." },
      { property: "og:title", content: "Game Hub | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Enter the Divine Quest game hub: play Ganesha Temple Run, Divine Aim, Color Chakra and Ganesh Rhythm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameHub,
});

const lockedGames = [
  { title: "Wisdom Riddles", detail: "Solve the temple's sacred puzzles" },
  { title: "Modak Rush", detail: "A frantic sweet-collecting challenge" },
  { title: "Guardian Duel", detail: "Face the temple guardians" },
];

function GameHub() {
  return (
    <main className="profile-screen min-h-svh bg-background text-foreground">
      <img src={templeImage} alt="Ancient temple lit by golden light" className="quest-background" width={1920} height={1200} />
      <div className="profile-veil" />
      <div className="energy-grid" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-8">
        <GameNavigation active="games" />

        <header className="mt-6 animate-rise">
          <p className="game-kicker">Chapter select</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-5xl">Game Hub</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Every challenge creates wisdom. Begin with the temple run and earn XP, coins and achievements for your profile.
          </p>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Available games">
          <article className="hub-card hub-card-featured animate-rise">
            <p className="game-kicker">Chapter One · Unlocked</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Ganesha Temple Run</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sprint through the living temple, dodge boulders, fire pits and light beams, and gather Modaks, Wisdom Stars
              and Coins across 1200m.
            </p>
            <ul className="hub-rewards">
              <li><Sparkles aria-hidden="true" /> Modak +10</li>
              <li><Star aria-hidden="true" /> Wisdom Star +25</li>
              <li><Coins aria-hidden="true" /> Coin +5</li>
            </ul>
            <Button size="lg" className="mt-5" asChild>
              <Link to="/games/temple-run"><Play aria-hidden="true" /> Play now</Link>
            </Button>
          </article>

          <article className="hub-card hub-card-featured animate-rise" style={{ animationDelay: "90ms" }}>
            <p className="game-kicker">Chapter Two · Unlocked</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Divine Aim</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag to aim and release orbs of divine energy into glowing lights across three peaceful rounds — still,
              drifting, then dancing lights. Can you beat your accuracy record?
            </p>
            <ul className="hub-rewards">
              <li><Target aria-hidden="true" /> Hit +10</li>
              <li><Sparkles aria-hidden="true" /> Divine centre +25</li>
              <li><Coins aria-hidden="true" /> Combo bonus</li>
            </ul>
            <Button size="lg" className="mt-5" asChild>
              <Link to="/games/divine-aim"><Play aria-hidden="true" /> Play now</Link>
            </Button>
          </article>

          <article className="hub-card hub-card-featured animate-rise" style={{ animationDelay: "120ms" }}>
            <p className="game-kicker">Chapter Three · Unlocked</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Color Chakra</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Spin the sacred four-colour wheel so glowing falling shapes meet their matching light. Three rounds —
              ten, fifteen, then twenty shapes — each faster than the last. Wrong colour costs a life.
            </p>
            <ul className="hub-rewards">
              <li><Sparkles aria-hidden="true" /> Match +10</li>
              <li><Star aria-hidden="true" /> Combo streaks</li>
              <li><Coins aria-hidden="true" /> Coins per match</li>
            </ul>
            <Button size="lg" className="mt-5" asChild>
              <Link to="/games/color-chakra"><Play aria-hidden="true" /> Play now</Link>
            </Button>
          </article>

          <article className="hub-card hub-card-featured animate-rise" style={{ animationDelay: "150ms" }}>
            <p className="game-kicker">Chapter Four · Unlocked</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Ganesh Rhythm</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Strike four glowing temple bells the moment each light touches the ring. Three original rhythm rounds —
              eight, twelve, then sixteen notes — each pattern quicker than the last.
            </p>
            <ul className="hub-rewards">
              <li><Bell aria-hidden="true" /> Perfect +20</li>
              <li><Sparkles aria-hidden="true" /> Good +10</li>
              <li><Coins aria-hidden="true" /> Combo bonus</li>
            </ul>
            <Button size="lg" className="mt-5" asChild>
              <Link to="/games/ganesh-rhythm"><Play aria-hidden="true" /> Play now</Link>
            </Button>
          </article>


          <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
            {lockedGames.map(({ title, detail }, index) => (
              <article className="hub-card hub-card-locked animate-rise" style={{ animationDelay: `${120 + index * 80}ms` }} key={title}>
                <LockKeyhole aria-hidden="true" />
                <div>
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
