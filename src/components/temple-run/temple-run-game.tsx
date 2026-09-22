import { Canvas } from "@react-three/fiber";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, Coins, Heart, Sparkles, Star, Trophy } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CHECKPOINT_EVERY, FINISH_DISTANCE, createStats, type Controls, type RunStats } from "./game-state";
import { TempleScene } from "./temple-scene";
import { submitGameResult, type GameResultSummary } from "@/lib/game-result.functions";

type Phase = "intro" | "running" | "over";

export function TempleRunGame() {
  const stats = useRef<RunStats>(createStats());
  const controls = useRef<Controls>({ lane: 1, jumpQueued: false, slideQueued: false });
  const running = useRef(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState<RunStats>(createStats());
  const [flash, setFlash] = useState("");
  const [outcome, setOutcome] = useState<"complete" | "failed">("complete");
  const [summary, setSummary] = useState<GameResultSummary | null>(null);
  const [saveError, setSaveError] = useState("");
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setHud({ ...stats.current }), 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(""), 1400);
    return () => window.clearTimeout(id);
  }, [flash]);

  function move(direction: -1 | 1) {
    controls.current.lane = Math.min(2, Math.max(0, controls.current.lane + direction));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "d", "w", "s"].includes(key)) {
        event.preventDefault();
      }
      if (key === "arrowleft" || key === "a") move(-1);
      if (key === "arrowright" || key === "d") move(1);
      if (key === "arrowup" || key === "w" || key === " ") controls.current.jumpQueued = true;
      if (key === "arrowdown" || key === "s") controls.current.slideQueued = true;
    }
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  }
  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) move(dx > 0 ? 1 : -1);
    else if (Math.abs(dy) > 28) {
      if (dy < 0) controls.current.jumpQueued = true;
      else controls.current.slideQueued = true;
    }
    touchStart.current = null;
  }

  function startRun() {
    stats.current = createStats();
    controls.current = { lane: 1, jumpQueued: false, slideQueued: false };
    setHud({ ...stats.current });
    setSummary(null);
    setSaveError("");
    setRunKey((value) => value + 1);
    running.current = true;
    setPhase("running");
  }

  async function endRun(result: "complete" | "failed") {
    running.current = false;
    const run = { ...stats.current };
    setHud(run);
    setOutcome(result);
    setPhase("over");

    const xpEarned = Math.floor(run.score / 2) + run.stars * 25 + (result === "complete" ? 150 : 0);
    stats.current.xp = xpEarned;
    const playerKey = window.localStorage.getItem("ganesha-player-key");
    if (!playerKey) {
      setSaveError("Choose your college to store this run in your profile.");
      return;
    }
    try {
      const saved = await submitGameResult({
        data: { playerKey, score: run.score, coins: run.coins, xp: xpEarned, stars: run.stars },
      });
      setSummary(saved);
    } catch {
      setSaveError("Your run could not be saved to your profile this time.");
    }
  }

  const accuracy = hud.encountered > 0 ? Math.round((hud.dodged / hud.encountered) * 100) : 100;
  const xpEarned = summary?.xp ?? Math.floor(hud.score / 2) + hud.stars * 25 + (outcome === "complete" ? 150 : 0);

  return (
    <div className="runner-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 3.4, 7.2], fov: 62 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <TempleScene
            key={runKey}
            stats={stats}
            controls={controls}
            running={running}
            onEnd={(result) => void endRun(result)}
            onFlash={setFlash}
          />
        </Suspense>
      </Canvas>

      <div className="runner-hud">
        <div className="runner-hud-row">
          <div className="runner-chip"><Trophy aria-hidden="true" /><span>{hud.score.toLocaleString()}</span><small>Score</small></div>
          <div className="runner-chip"><Coins aria-hidden="true" /><span>{hud.coins}</span><small>Coins</small></div>
          <div className="runner-chip"><Sparkles aria-hidden="true" /><span>{hud.modaks}</span><small>Modaks</small></div>
          <div className="runner-chip"><Star aria-hidden="true" /><span>{hud.stars}</span><small>Stars</small></div>
          <div className="runner-chip runner-hearts" aria-label={`${hud.health} lives left`}>
            {[0, 1, 2].map((index) => (
              <Heart key={index} className={index < hud.health ? "heart-full" : "heart-empty"} aria-hidden="true" />
            ))}
          </div>
        </div>
        <div className="runner-progress" role="progressbar" aria-valuemin={0} aria-valuemax={FINISH_DISTANCE} aria-valuenow={Math.floor(hud.distance)}>
          <span style={{ width: `${Math.min(100, (hud.distance / FINISH_DISTANCE) * 100)}%` }} />
        </div>
        <p className="runner-distance">{Math.floor(hud.distance)}m / {FINISH_DISTANCE}m · Checkpoint {hud.checkpoint}</p>
      </div>

      {flash && <p className="runner-flash">{flash}</p>}

      {phase === "running" && (
        <div className="runner-touch">
          <button type="button" aria-label="Move left" onClick={() => move(-1)}><ArrowLeft /></button>
          <button type="button" aria-label="Jump" onClick={() => { controls.current.jumpQueued = true; }}><ArrowUp /></button>
          <button type="button" aria-label="Slide" onClick={() => { controls.current.slideQueued = true; }}><ChevronsDown /></button>
          <button type="button" aria-label="Move right" onClick={() => move(1)}><ArrowRight /></button>
        </div>
      )}

      {phase === "intro" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">Chapter One</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">Ganesha Temple Run</h1>
            <p className="mt-3 text-muted-foreground">
              Sprint through the living temple. Dodge boulders, leap the broken walls and fire pits, slide under the light
              beams, and gather Modaks, Wisdom Stars and Coins. A checkpoint every {CHECKPOINT_EVERY}m restores a heart.
            </p>
            <ul className="runner-keys">
              <li><b>← →</b> or A / D — change lane</li>
              <li><b>Space</b> or ↑ — jump</li>
              <li><b>↓</b> or S — slide</li>
              <li><b>Swipe</b> on mobile</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={startRun}>Begin the Run</Button>
              <Button size="lg" variant="outline" asChild><Link to="/games">Back to Hub</Link></Button>
            </div>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">{outcome === "complete" ? "The temple honours you" : "The temple tested you"}</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">
              {outcome === "complete" ? "QUEST COMPLETE!" : "QUEST ENDED"}
            </h1>
            <div className="runner-summary">
              <div><small>Score</small><strong>{hud.score.toLocaleString()}</strong></div>
              <div><small>XP earned</small><strong>{xpEarned.toLocaleString()}</strong></div>
              <div><small>Coins collected</small><strong>{hud.coins}</strong></div>
              <div><small>Best score</small><strong>{(summary?.bestScore ?? hud.score).toLocaleString()}</strong></div>
              <div><small>Survived</small><strong>{Math.floor(hud.distance)}m</strong></div>
              <div><small>Dodge accuracy</small><strong>{accuracy}%</strong></div>
            </div>
            {saveError && <p className="mt-4 text-sm text-destructive" role="alert">{saveError}</p>}
            {summary && <p className="mt-4 text-sm text-primary">Profile updated · Level {summary.level} · {summary.completedGames} games completed</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild><Link to="/games">Continue</Link></Button>
              <Button size="lg" variant="outline" onClick={startRun}>Run Again</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
