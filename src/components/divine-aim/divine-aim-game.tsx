import { Link } from "@tanstack/react-router";
import { Coins, Crosshair, Flame, Sparkles, Target as TargetIcon, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { submitGameResult, type GameResultSummary } from "@/lib/game-result.functions";

type Phase = "intro" | "playing" | "break" | "over";

type Target = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alive: boolean;
  pulse: number;
};

type Orb = { x: number; y: number; vx: number; vy: number; active: boolean; trail: { x: number; y: number }[] };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number; size: number };

const ROUNDS = [
  { count: 5, radius: 40, speed: 0, shots: 8, label: "Still Lights" },
  { count: 7, radius: 32, speed: 78, shots: 11, label: "Drifting Lights" },
  { count: 10, radius: 23, speed: 132, shots: 15, label: "Dancing Lights" },
];

const WORLD = { w: 900, h: 1200 };
const LAUNCH = { x: WORLD.w / 2, y: WORLD.h - 90 };
const BEST_KEY = "divine-aim-best";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function DivineAimGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targets = useRef<Target[]>([]);
  const orbs = useRef<Orb[]>([]);
  const particles = useRef<Particle[]>([]);
  const aim = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: LAUNCH.x, y: LAUNCH.y - 200 });
  const glow = useRef(0);
  const phaseRef = useRef<Phase>("intro");

  const score = useRef(0);
  const shots = useRef(0);
  const shotsFired = useRef(0);
  const hits = useRef(0);
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const roundIndex = useRef(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState({ score: 0, shots: 0, combo: 0, round: 1, targets: 0 });
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState("");
  const [summary, setSummary] = useState<GameResultSummary | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHud({
        score: score.current,
        shots: shots.current,
        combo: combo.current,
        round: roundIndex.current + 1,
        targets: targets.current.filter((t) => t.alive).length,
      });
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(""), 1100);
    return () => window.clearTimeout(id);
  }, [flash]);

  function burst(x: number, y: number, hue: number, amount: number) {
    for (let i = 0; i < amount; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(60, 420);
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.4, 1),
        max: 1,
        hue,
        size: rand(2, 6),
      });
    }
    if (particles.current.length > 700) particles.current.splice(0, particles.current.length - 700);
  }

  const buildRound = useCallback((index: number) => {
    const config = ROUNDS[index]!;
    targets.current = Array.from({ length: config.count }, () => {
      const angle = rand(0, Math.PI * 2);
      return {
        x: rand(config.radius + 40, WORLD.w - config.radius - 40),
        y: rand(120, WORLD.h * 0.62),
        r: config.radius,
        vx: Math.cos(angle) * config.speed,
        vy: Math.sin(angle) * config.speed * 0.6,
        alive: true,
        pulse: rand(0, Math.PI * 2),
      };
    });
    orbs.current = [];
    shots.current = config.shots;
    roundIndex.current = index;
  }, []);

  const startGame = useCallback(() => {
    score.current = 0;
    hits.current = 0;
    shotsFired.current = 0;
    combo.current = 0;
    bestCombo.current = 0;
    particles.current = [];
    setSummary(null);
    setSaveError("");
    buildRound(0);
    phaseRef.current = "playing";
    setPhase("playing");
    setFlash(`Round 1 · ${ROUNDS[0]!.label}`);
  }, [buildRound]);

  const finishGame = useCallback(async () => {
    phaseRef.current = "over";
    setPhase("over");
    const finalScore = score.current;
    if (finalScore > best) {
      setBest(finalScore);
      window.localStorage.setItem(BEST_KEY, String(finalScore));
    }
    const xpEarned = Math.floor(finalScore / 2) + hits.current * 5 + bestCombo.current * 10;
    const coinsEarned = hits.current * 2;
    const playerKey = window.localStorage.getItem("ganesha-player-key");
    if (!playerKey) {
      setSaveError("Choose your college to store this run in your profile.");
      return;
    }
    try {
      const saved = await submitGameResult({
        data: { playerKey, score: finalScore, coins: coinsEarned, xp: xpEarned, stars: 0 },
      });
      setSummary(saved);
    } catch {
      setSaveError("Your run could not be saved to your profile this time.");
    }
  }, [best]);

  const advance = useCallback(() => {
    if (roundIndex.current >= ROUNDS.length - 1) {
      void finishGame();
      return;
    }
    phaseRef.current = "break";
    setPhase("break");
  }, [finishGame]);

  const nextRound = useCallback(() => {
    buildRound(roundIndex.current + 1);
    phaseRef.current = "playing";
    setPhase("playing");
    setFlash(`Round ${roundIndex.current + 1} · ${ROUNDS[roundIndex.current]!.label}`);
  }, [buildRound]);

  function launch() {
    if (phaseRef.current !== "playing" || shots.current <= 0) return;
    const dx = aim.current.x - LAUNCH.x;
    const dy = aim.current.y - LAUNCH.y;
    const length = Math.hypot(dx, dy) || 1;
    const power = Math.min(1, Math.max(0.35, length / 620));
    const speed = 620 + power * 780;
    orbs.current.push({
      x: LAUNCH.x,
      y: LAUNCH.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      active: true,
      trail: [],
    });
    shots.current -= 1;
    shotsFired.current += 1;
    burst(LAUNCH.x, LAUNCH.y, 45, 12);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let last = performance.now();
    const view = { scale: 1, offsetX: 0, offsetY: 0 };

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      const scale = Math.max(rect.width / WORLD.w, rect.height / WORLD.h);
      view.scale = scale * dpr;
      view.offsetX = (canvas!.width - WORLD.w * view.scale) / 2;
      view.offsetY = (canvas!.height - WORLD.h * view.scale) / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const dpr = canvas!.width / rect.width;
      return {
        x: ((clientX - rect.left) * dpr - view.offsetX) / view.scale,
        y: ((clientY - rect.top) * dpr - view.offsetY) / view.scale,
      };
    }

    function onDown(event: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      canvas!.setPointerCapture(event.pointerId);
      aim.current = { active: true, ...toWorld(event.clientX, event.clientY) };
    }
    function onMove(event: PointerEvent) {
      if (!aim.current.active) return;
      const point = toWorld(event.clientX, event.clientY);
      aim.current.x = point.x;
      aim.current.y = point.y;
    }
    function onUp() {
      if (!aim.current.active) return;
      aim.current.active = false;
      launch();
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    function update(dt: number) {
      glow.current += dt;
      const playing = phaseRef.current === "playing";

      for (const target of targets.current) {
        if (!target.alive) continue;
        target.pulse += dt * 2.4;
        if (!playing) continue;
        target.x += target.vx * dt;
        target.y += target.vy * dt;
        if (target.x < target.r + 24 || target.x > WORLD.w - target.r - 24) {
          target.vx *= -1;
          target.x = Math.min(WORLD.w - target.r - 24, Math.max(target.r + 24, target.x));
        }
        if (target.y < target.r + 60 || target.y > WORLD.h * 0.68) {
          target.vy *= -1;
          target.y = Math.min(WORLD.h * 0.68, Math.max(target.r + 60, target.y));
        }
      }

      for (const orb of orbs.current) {
        if (!orb.active) continue;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.vy += 240 * dt;
        orb.trail.push({ x: orb.x, y: orb.y });
        if (orb.trail.length > 16) orb.trail.shift();

        if (orb.x < -60 || orb.x > WORLD.w + 60 || orb.y < -160 || orb.y > WORLD.h + 80) {
          orb.active = false;
          if (playing) {
            combo.current = 0;
            setFlash("Missed · combo reset");
          }
          continue;
        }

        for (const target of targets.current) {
          if (!target.alive) continue;
          const distance = Math.hypot(target.x - orb.x, target.y - orb.y);
          if (distance > target.r + 12) continue;
          target.alive = false;
          orb.active = false;
          hits.current += 1;
          combo.current += 1;
          bestCombo.current = Math.max(bestCombo.current, combo.current);
          const center = distance <= target.r * 0.38;
          const comboBonus = combo.current > 1 ? combo.current * 5 : 0;
          score.current += (center ? 25 : 10) + comboBonus;
          burst(target.x, target.y, center ? 48 : 40, center ? 46 : 30);
          setFlash(
            center
              ? `Divine centre +${25 + comboBonus}${comboBonus ? ` · combo x${combo.current}` : ""}`
              : `Hit +${10 + comboBonus}${comboBonus ? ` · combo x${combo.current}` : ""}`,
          );
          break;
        }
      }
      orbs.current = orbs.current.filter((orb) => orb.active);

      for (const particle of particles.current) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 180 * dt;
        particle.vx *= 0.985;
      }
      particles.current = particles.current.filter((particle) => particle.life > 0);

      if (playing) {
        const remaining = targets.current.filter((target) => target.alive).length;
        if (remaining === 0 || (shots.current <= 0 && orbs.current.length === 0)) advance();
      }
    }

    function drawTarget(ctx: CanvasRenderingContext2D, target: Target) {
      const pulse = 1 + Math.sin(target.pulse) * 0.06;
      const r = target.r * pulse;
      const halo = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, r * 2.3);
      halo.addColorStop(0, "rgba(255, 214, 130, 0.55)");
      halo.addColorStop(1, "rgba(255, 190, 90, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(target.x, target.y, r * 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 205, 120, 0.85)";
      ctx.beginPath();
      ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 236, 190, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, r * 0.68, 0, Math.PI * 2);
      ctx.stroke();

      const core = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, r * 0.4);
      core.addColorStop(0, "rgba(255, 255, 245, 0.98)");
      core.addColorStop(1, "rgba(255, 190, 80, 0.35)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(target.x, target.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    function render() {
      const ctx = context!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.fillStyle = "#0a0712";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

      const sky = ctx.createRadialGradient(WORLD.w / 2, WORLD.h * 0.28, 40, WORLD.w / 2, WORLD.h * 0.4, WORLD.h * 0.8);
      sky.addColorStop(0, "rgba(96, 62, 18, 0.85)");
      sky.addColorStop(0.5, "rgba(30, 20, 44, 0.9)");
      sky.addColorStop(1, "#08060f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      ctx.strokeStyle = "rgba(255, 200, 110, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD.w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD.h);
        ctx.stroke();
      }
      for (let y = 0; y <= WORLD.h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.w, y);
        ctx.stroke();
      }

      // Sacred arch behind the arena.
      ctx.strokeStyle = "rgba(255, 196, 96, 0.16)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(WORLD.w / 2, WORLD.h * 0.44, WORLD.w * 0.44, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();

      for (const target of targets.current) if (target.alive) drawTarget(ctx, target);

      if (aim.current.active && phaseRef.current === "playing") {
        const dx = aim.current.x - LAUNCH.x;
        const dy = aim.current.y - LAUNCH.y;
        const length = Math.hypot(dx, dy) || 1;
        ctx.save();
        ctx.setLineDash([14, 14]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255, 214, 130, 0.75)";
        ctx.beginPath();
        ctx.moveTo(LAUNCH.x, LAUNCH.y);
        ctx.lineTo(LAUNCH.x + (dx / length) * Math.min(length, 560), LAUNCH.y + (dy / length) * Math.min(length, 560));
        ctx.stroke();
        ctx.restore();
      }

      for (const orb of orbs.current) {
        orb.trail.forEach((point, index) => {
          const alpha = (index / orb.trail.length) * 0.45;
          ctx.fillStyle = `rgba(255, 226, 160, ${alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6 + index * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
        const orbGlow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 34);
        orbGlow.addColorStop(0, "rgba(255, 255, 240, 1)");
        orbGlow.addColorStop(0.35, "rgba(255, 206, 110, 0.85)");
        orbGlow.addColorStop(1, "rgba(255, 170, 60, 0)");
        ctx.fillStyle = orbGlow;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const particle of particles.current) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.max);
        ctx.fillStyle = `hsl(${particle.hue}, 95%, ${62 + particle.size * 3}%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Launch shrine.
      const pedestal = ctx.createRadialGradient(LAUNCH.x, LAUNCH.y, 0, LAUNCH.x, LAUNCH.y, 130);
      pedestal.addColorStop(0, "rgba(255, 214, 140, 0.5)");
      pedestal.addColorStop(1, "rgba(255, 170, 60, 0)");
      ctx.fillStyle = pedestal;
      ctx.beginPath();
      ctx.arc(LAUNCH.x, LAUNCH.y, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 240, 205, 0.95)";
      ctx.beginPath();
      ctx.arc(LAUNCH.x, LAUNCH.y, 18 + Math.sin(glow.current * 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      frame = window.requestAnimationFrame(loop);
    }
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance]);

  const totalTargets = ROUNDS.reduce((sum, round) => sum + round.count, 0);
  const accuracy = shotsFired.current > 0 ? Math.round((hits.current / shotsFired.current) * 100) : 0;
  const xpEarned = Math.floor(score.current / 2) + hits.current * 5 + bestCombo.current * 10;
  const coinsEarned = hits.current * 2;

  return (
    <div className="aim-stage">
      <canvas ref={canvasRef} className="aim-canvas" aria-label="Divine Aim arena" />

      <div className="runner-hud">
        <div className="runner-hud-row">
          <div className="runner-chip"><Trophy aria-hidden="true" /><span>{hud.score.toLocaleString()}</span><small>Score</small></div>
          <div className="runner-chip"><TargetIcon aria-hidden="true" /><span>{hud.round} / 3</span><small>Round</small></div>
          <div className="runner-chip"><Crosshair aria-hidden="true" /><span>{hud.shots}</span><small>Shots</small></div>
          <div className="runner-chip"><Flame aria-hidden="true" /><span>x{hud.combo}</span><small>Combo</small></div>
          <div className="runner-chip"><Sparkles aria-hidden="true" /><span>{hud.targets}</span><small>Lights left</small></div>
          <div className="runner-chip"><Coins aria-hidden="true" /><span>{best.toLocaleString()}</span><small>Best</small></div>
        </div>
      </div>

      {flash && <p className="runner-flash">{flash}</p>}
      {phase === "playing" && <p className="aim-hint">Drag anywhere to aim · release to send the orb</p>}

      {phase === "intro" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">Chapter Two</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">Divine Aim</h1>
            <p className="mt-3 text-muted-foreground">
              Send orbs of divine energy into glowing lights across three peaceful rounds — still lights, drifting lights,
              then dancing lights. Centre hits shine brightest and unbroken hits build a combo.
            </p>
            <ul className="runner-keys">
              <li><b>Drag</b> anywhere to aim</li>
              <li><b>Release</b> to launch the orb</li>
              <li><b>Centre hit</b> +25 · normal +10 · combo bonus</li>
            </ul>
            <p className="mt-4 text-sm text-primary">Can you beat your accuracy record?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={startGame}>Begin the Aim</Button>
              <Button size="lg" variant="outline" asChild><Link to="/games">Back to Hub</Link></Button>
            </div>
          </div>
        </div>
      )}

      {phase === "break" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">Round {roundIndex.current + 1} complete</p>
            <h1 className="font-display text-3xl font-semibold">Next: {ROUNDS[roundIndex.current + 1]?.label}</h1>
            <div className="runner-summary">
              <div><small>Score</small><strong>{score.current.toLocaleString()}</strong></div>
              <div><small>Best combo</small><strong>x{bestCombo.current}</strong></div>
              <div><small>Lights hit</small><strong>{hits.current}</strong></div>
              <div><small>Accuracy</small><strong>{accuracy}%</strong></div>
            </div>
            <Button size="lg" className="mt-6" onClick={nextRound}>Continue</Button>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">The lights bow to you</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">DIVINE AIM COMPLETE!</h1>
            <div className="runner-summary">
              <div><small>Final score</small><strong>{score.current.toLocaleString()}</strong></div>
              <div><small>Accuracy</small><strong>{accuracy}%</strong></div>
              <div><small>Lights hit</small><strong>{hits.current} / {totalTargets}</strong></div>
              <div><small>Best score</small><strong>{Math.max(best, score.current).toLocaleString()}</strong></div>
              <div><small>XP earned</small><strong>{(summary?.xp ?? xpEarned).toLocaleString()}</strong></div>
              <div><small>Coins collected</small><strong>{(summary?.coins ?? coinsEarned).toLocaleString()}</strong></div>
            </div>
            {saveError && <p className="mt-4 text-sm text-destructive" role="alert">{saveError}</p>}
            {summary && <p className="mt-4 text-sm text-primary">Profile updated · Level {summary.level} · {summary.completedGames} games completed</p>}
            <p className="mt-4 text-sm text-muted-foreground">Can you beat your accuracy record?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={startGame}>Play Again</Button>
              <Button size="lg" variant="outline" asChild><Link to="/games">Return to Game Hub</Link></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
