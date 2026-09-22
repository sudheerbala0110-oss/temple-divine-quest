import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";

import templeImage from "@/assets/ganesha-temple.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ganesha: The Divine Quest | Adventure Game" },
      { name: "description", content: "Begin a cinematic journey where every challenge creates wisdom." },
      { property: "og:title", content: "Ganesha: The Divine Quest" },
      { property: "og:description", content: "Every Challenge Creates Wisdom" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="quest-screen relative min-h-svh overflow-hidden bg-background text-foreground">
      <img src={templeImage} alt="A futuristic ancient temple illuminated by divine golden light" className="quest-background animate-temple" width={1920} height={1200} />
      <div className="quest-veil" />
      <div className="energy-grid" aria-hidden="true" />
      <div className="divine-beam" aria-hidden="true" />
      <div className="particle-field" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
      </div>

      <div className="relative z-10 flex min-h-svh flex-col px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between animate-fade-soft">
          <div className="flex items-center gap-3">
            <span className="brand-sigil"><Sparkles className="size-4" /></span>
            <span className="game-kicker">Divine Quest</span>
          </div>
          <span className="game-status"><span /> Journey ready</span>
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center pb-14 pt-10 text-center sm:pb-6">
          <p className="game-kicker mb-5 animate-rise">A mythic journey begins</p>
          <h1 className="game-title animate-rise">
            <span>Ganesha</span>
            <small>The Divine Quest</small>
          </h1>
          <div className="title-rule animate-rise" aria-hidden="true"><span /></div>
          <p className="game-subtitle animate-rise">Every Challenge Creates Wisdom</p>
          <Button asChild variant="divine" size="lg" className="mt-8 min-w-64 animate-rise sm:mt-10">
            <Link to="/choose-college">Start Adventure <ChevronRight className="size-5" /></Link>
          </Button>
          <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-muted-foreground animate-fade-soft">Enter the sacred realm</p>
        </section>

        <footer className="flex items-end justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground animate-fade-soft">
          <span>Chapter I</span>
          <span className="hidden sm:block">The path of wisdom</span>
          <span>∞</span>
        </footer>
      </div>
    </main>
  );
}
