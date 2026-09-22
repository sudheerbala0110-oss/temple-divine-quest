import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, LoaderCircle, MapPin, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import templeImage from "@/assets/ganesha-temple.jpg";
import { Button } from "@/components/ui/button";
import { NIAT_COLLEGES, type NiatCollege } from "@/lib/niat-colleges";
import { getPlayerProfile, savePlayerCollege } from "@/lib/player-profile.functions";

export const Route = createFileRoute("/choose-college")({
  head: () => ({
    meta: [
      { title: "Choose Your College | Ganesha: The Divine Quest" },
      { name: "description", content: "Choose the college where your divine quest will begin." },
      { property: "og:title", content: "Choose Your College | Ganesha: The Divine Quest" },
      { property: "og:description", content: "Choose the college where your divine quest will begin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChooseCollege,
});

function ChooseCollege() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<NiatCollege | null>(null);
  const [playerKey, setPlayerKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey = window.localStorage.getItem("ganesha-player-key");
    const key = storedKey ?? crypto.randomUUID();
    if (!storedKey) window.localStorage.setItem("ganesha-player-key", key);
    setPlayerKey(key);
    getPlayerProfile({ data: { playerKey: key } })
      .then((profile) => {
        if (profile) setSelected({ name: profile.selected_college_name, location: profile.selected_college_location });
      })
      .catch(() => undefined);
  }, []);

  const colleges = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return NIAT_COLLEGES;
    return NIAT_COLLEGES.filter((college) =>
      `${college.name} ${college.location}`.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);

  async function chooseCollege(college: NiatCollege) {
    if (!playerKey || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await savePlayerCollege({ data: { playerKey, collegeName: college.name, collegeLocation: college.location } });
      setSelected(college);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your college.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="quest-screen min-h-svh overflow-hidden bg-background text-foreground">
      <img src={templeImage} alt="Ancient temple glowing with divine light" className="quest-background" width={1920} height={1200} />
      <div className="quest-veil" />
      <div className="energy-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <nav className="flex items-center justify-between">
          <span className="game-kicker">Ganesha · The Divine Quest</span>
          <span className="game-kicker">Quest setup · 01</span>
        </nav>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col py-10 sm:py-14">
          <div className="text-center animate-rise">
            <Sparkles className="mx-auto mb-4 size-5 text-primary" aria-hidden="true" />
            <p className="game-kicker mb-3">The path awaits</p>
            <h1 className="game-heading text-4xl sm:text-6xl">Choose Your College</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Select your college to enter the Divine Quest.
            </p>
          </div>

          {selected && (
            <div className="welcome-panel animate-scale-in" role="status">
              <div>
                <p className="game-kicker">College confirmed</p>
                <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Welcome, {selected.name}!</h2>
              </div>
              <Button asChild size="lg">
                <Link to="/profile">Enter the Divine Quest <ChevronRight className="size-5" /></Link>
              </Button>
            </div>
          )}

          <label className="college-search animate-rise">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search colleges</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by college or location" />
          </label>

          {error && <p className="mt-4 text-center text-sm text-destructive" role="alert">{error}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colleges.map((college, index) => (
              <article
                key={`${college.name}-${college.location}`}
                className={`college-card animate-rise ${selected?.name === college.name && selected.location === college.location ? "college-card-selected" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className="college-number">0{index + 1}</span>
                  {selected?.name === college.name && selected.location === college.location
                    ? <span className="college-check"><Check className="size-4" /></span>
                    : <MapPin className="size-4 text-primary" />}
                </div>
                <div className="mt-8 flex flex-1 flex-col">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><MapPin className="size-3" />{college.location}</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-foreground">{college.name}</h2>
                  <Button
                    type="button"
                    variant={selected?.name === college.name && selected.location === college.location ? "divine" : "ghost"}
                    className="mt-auto w-full"
                    disabled={!playerKey || isSaving}
                    onClick={() => void chooseCollege(college)}
                  >
                    {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {selected?.name === college.name && selected.location === college.location ? "Selected" : "Select"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {colleges.length === 0 && <p className="py-16 text-center text-muted-foreground">No verified colleges match your search.</p>}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Institutions shown are from NIAT’s official collaborating institutions directory.
          </p>
        </section>
      </div>
    </main>
  );
}