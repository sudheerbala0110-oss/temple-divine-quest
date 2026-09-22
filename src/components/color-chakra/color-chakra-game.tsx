import { Link } from "@tanstack/react-router";
import { Coins, Flame, Heart, RotateCw, Sparkles, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { submitGameResult, type GameResultSummary } from "@/lib/game-result.functions";

type Phase = "intro" | "playing" | "break" | "over";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Falling = { color: number; y: number; spin: number } | null;

const PALETTE = [
  { name: "Saffron", css: "#ff9d2e", hue: 32 },
  { name: "Lotus", css: "#ff4f8b", hue: 340 },
  { name: "Sky", css: "#43c9ff", hue: 195 },
  { name: "Leaf", css: "#68e06b", hue: 130 },
];

const ROUNDS = [
  { objects: 10, speed: 165, label: "Slow Awakening" },
  { objects: 15, speed: 250, label: "Steady Flow" },
  { objects: 20, speed: 350, label: "Blazing Chakra" },
];

const WORLD = { w: 900, h: 1200 };
const CENTER = { x: WORLD.w / 2, y: 880 };
const RADIUS = 210;
const QUARTER = Math.PI / 2;
const TOTAL_OBJECTS = ROUNDS.reduce((sum, round) => sum + round.objects, 0);
const BEST_KEY = "color-chakra-best";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function ColorChakraGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("intro");

  const wheel = useRef<number[]>([0, 1, 2, 3]);
  const rotation = useRef(0);
  const targetRotation = useRef(0);
  const falling = useRef<Falling>(null);
  const particles = useRef<Particle[]>([]);
  const flash = useRef({ life: 0, color: "#ffffff" });
  const popups = useRef<{ text: string; life: number; color: string }[]>([]);

  const score = useRef(0);
  const lives = useRef(3);
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const correct = useRef(0);
  const mistakes = useRef(0);
  const roundIndex = useRef(0);
  const spawned = useRef(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState({ score: 0, lives: 3, combo: 0, round: 1, left: 0 });
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("");
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
        lives: lives.current,
        combo: combo.current,
        round: roundIndex.current + 1,
        left: Math.max(0, ROUNDS[roundIndex.current]!.objects - spawned.current),
      });
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), 1100);
    return () => window.clearTimeout(id);
  }, [message]);

  const finishGame = useCallback(async () => {
    phaseRef.current = "over";
    setPhase("over");
    falling.current = null;
    const finalScore = score.current;
    if (finalScore > best) {
      setBest(finalScore);
      window.localStorage.setItem(BEST_KEY, String(finalScore));
    }
    const xpEarned = Math.floor(finalScore / 2) + correct.current * 5 + bestCombo.current * 10;
    const coinsEarned = correct.current * 2;
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

  const beginRound = useCallback((index: number) => {
    roundIndex.current = index;
    spawned.current = 0;
    wheel.current = shuffle([0, 1, 2, 3]);
    rotation.current = 0;
    targetRotation.current = 0;
    falling.current = null;
    phaseRef.current = "playing";
    setPhase("playing");
    setMessage(`Round ${index + 1} · ${ROUNDS[index]!.label}`);
  }, []);

  const startGame = useCallback(() => {
    score.current = 0;
    lives.current = 3;
    combo.current = 0;
    bestCombo.current = 0;
    correct.current = 0;
    mistakes.current = 0;
    particles.current = [];
    popups.current = [];
    setSummary(null);
    setSaveError("");
    beginRound(0);
  }, [beginRound]);

  const nextRound = useCallback(() => beginRound(roundIndex.current + 1), [beginRound]);

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

    function spin(direction: number) {
      if (phaseRef.current !== "playing") return;
      targetRotation.current += direction * QUARTER;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        spin(-1);
        event.preventDefault();
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        spin(1);
        event.preventDefault();
      }
    }

    function onPointer(event: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      const rect = canvas!.getBoundingClientRect();
      spin(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    function burst(x: number, y: number, color: string, amount: number) {
      for (let i = 0; i < amount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 420;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.6,
          color,
          size: 2 + Math.random() * 5,
        });
      }
      if (particles.current.length > 600) particles.current.splice(0, particles.current.length - 600);
    }

    // Which palette colour currently sits at the top slot of the wheel.
    function topColor() {
      const steps = Math.round(rotation.current / QUARTER);
      const index = ((-steps) % 4 + 4) % 4;
      return wheel.current[index]!;
    }

    function resolve() {
      const object = falling.current;
      if (!object) return;
      const matched = topColor() === object.color;
      const swatch = PALETTE[object.color]!;
      falling.current = null;
      if (matched) {
        correct.current += 1;
        combo.current += 1;
        bestCombo.current = Math.max(bestCombo.current, combo.current);
        score.current += 10;
        burst(CENTER.x, CENTER.y - RADIUS, swatch.css, 44);
        flash.current = { life: 0.28, color: swatch.css };
        popups.current.push({
          text: combo.current > 1 ? `+10 · combo x${combo.current}` : "+10",
          life: 0.9,
          color: swatch.css,
        });
      } else {
        mistakes.current += 1;
        combo.current = 0;
        lives.current -= 1;
        burst(CENTER.x, CENTER.y - RADIUS, "#ff5470", 30);
        flash.current = { life: 0.24, color: "#ff5470" };
        popups.current.push({ text: `${swatch.name} missed`, life: 0.9, color: "#ff8da3" });
      }

      if (lives.current <= 0) {
        void finishGame();
        return;
      }
      if (spawned.current >= ROUNDS[roundIndex.current]!.objects) {
        if (roundIndex.current >= ROUNDS.length - 1) {
          void finishGame();
        } else {
          phaseRef.current = "break";
          setPhase("break");
        }
      }
    }

    function update(dt: number) {
      const diff = targetRotation.current - rotation.current;
      rotation.current += diff * Math.min(1, dt * 12);

      if (phaseRef.current === "playing") {
        const config = ROUNDS[roundIndex.current]!;
        if (!falling.current && spawned.current < config.objects) {
          spawned.current += 1;
          falling.current = { color: Math.floor(Math.random() * 4), y: -60, spin: 0 };
        }
        if (falling.current) {
          falling.current.y += config.speed * dt;
          falling.current.spin += dt * 3;
          if (falling.current.y >= CENTER.y - RADIUS) resolve();
        }
      }

      for (const particle of particles.current) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 220 * dt;
        particle.vx *= 0.985;
      }
      particles.current = particles.current.filter((particle) => particle.life > 0);
      for (const popup of popups.current) popup.life -= dt;
      popups.current = popups.current.filter((popup) => popup.life > 0);
      if (flash.current.life > 0) flash.current.life -= dt;
    }

    function drawWheel(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.translate(CENTER.x, CENTER.y);

      const halo = ctx.createRadialGradient(0, 0, RADIUS * 0.4, 0, 0, RADIUS * 1.65);
      halo.addColorStop(0, "rgba(255, 235, 190, 0.22)");
      halo.addColorStop(1, "rgba(255, 200, 120, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, RADIUS * 1.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(rotation.current);
      wheel.current.forEach((colorIndex, slot) => {
        const swatch = PALETTE[colorIndex]!;
        const start = -Math.PI / 2 - QUARTER / 2 + slot * QUARTER;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, RADIUS, start, start + QUARTER);
        ctx.closePath();
        const gradient = ctx.createRadialGradient(0, 0, RADIUS * 0.15, 0, 0, RADIUS);
        gradient.addColorStop(0, `${swatch.css}55`);
        gradient.addColorStop(1, swatch.css);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(10, 7, 16, 0.7)";
        ctx.stroke();
      });
      ctx.restore();

      // Chakra hub.
      ctx.fillStyle = "rgba(12, 8, 20, 0.92)";
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, RADIUS * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 214, 140, 0.7)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Receiver marker at the top slot.
      ctx.strokeStyle = "rgba(255, 250, 235, 0.9)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y - RADIUS, 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    function render() {
      const ctx = context!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.fillStyle = "#080611";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

      const sky = ctx.createRadialGradient(CENTER.x, CENTER.y, 60, CENTER.x, CENTER.y * 0.9, WORLD.h * 0.85);
      sky.addColorStop(0, "rgba(84, 52, 122, 0.75)");
      sky.addColorStop(0.55, "rgba(24, 16, 38, 0.92)");
      sky.addColorStop(1, "#07050e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      ctx.strokeStyle = "rgba(255, 210, 140, 0.06)";
      ctx.lineWidth = 1;
      for (let y = 0; y <= WORLD.h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.w, y);
        ctx.stroke();
      }

      // Drop lane.
      ctx.fillStyle = "rgba(255, 240, 210, 0.05)";
      ctx.fillRect(CENTER.x - 44, 0, 88, CENTER.y - RADIUS);

      drawWheel(ctx);

      const object = falling.current;
      if (object) {
        const swatch = PALETTE[object.color]!;
        const glow = ctx.createRadialGradient(CENTER.x, object.y, 0, CENTER.x, object.y, 70);
        glow.addColorStop(0, "rgba(255,255,255,0.95)");
        glow.addColorStop(0.35, `${swatch.css}dd`);
        glow.addColorStop(1, `${swatch.css}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(CENTER.x, object.y, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(CENTER.x, object.y);
        ctx.rotate(object.spin);
        ctx.fillStyle = swatch.css;
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const r = i % 2 === 0 ? 30 : 20;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      for (const particle of particles.current) {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      popups.current.forEach((popup, index) => {
        ctx.globalAlpha = Math.max(0, popup.life);
        ctx.fillStyle = popup.color;
        ctx.font = "bold 52px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(popup.text, CENTER.x, CENTER.y - RADIUS - 70 - (0.9 - popup.life) * 90 - index * 6);
        ctx.globalAlpha = 1;
      });

      if (flash.current.life > 0) {
        ctx.globalAlpha = Math.min(0.4, flash.current.life);
        ctx.fillStyle = flash.current.color;
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);
        ctx.globalAlpha = 1;
      }
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
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishGame]);

  const xpEarned = Math.floor(score.current / 2) + correct.current * 5 + bestCombo.current * 10;
  const coinsEarned = correct.current * 2;

  return (
    <div className="chakra-stage">
      <canvas ref={canvasRef} className="chakra-canvas" aria-label="Color Chakra arena" />

      <div className="runner-hud">
        <div className="runner-hud-row">
          <div className="runner-chip"><Trophy aria-hidden="true" /><span>{hud.score.toLocaleString()}</span><small>Score</small></div>
          <div className="runner-chip"><RotateCw aria-hidden="true" /><span>{hud.round} / 3</span><small>Round</small></div>
          <div className="runner-chip"><Heart aria-hidden="true" /><span>{hud.lives}</span><small>Lives</small></div>
          <div className="runner-chip"><Flame aria-hidden="true" /><span>x{hud.combo}</span><small>Combo</small></div>
          <div className="runner-chip"><Sparkles aria-hidden="true" /><span>{hud.left}</span><small>Left</small></div>
          <div className="runner-chip"><Coins aria-hidden="true" /><span>{best.toLocaleString()}</span><small>Best</small></div>
        </div>
      </div>

      {message && <p className="runner-flash">{message}</p>}
      {phase === "playing" && <p className="aim-hint">Tap left or right side · arrow keys to spin the chakra</p>}

      {phase === "intro" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">Chapter Three</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">Color Chakra</h1>
            <p className="mt-3 text-muted-foreground">
              A glowing shape falls toward the sacred wheel. Spin the chakra so its matching colour meets the light —
              ten, then fifteen, then twenty shapes, each faster than the last.
            </p>
            <ul className="runner-keys">
              <li><b>Tap</b> the left or right half to spin</li>
              <li><b>← →</b> or <b>A D</b> on a keyboard</li>
              <li><b>Match</b> +10 · wrong colour costs a life</li>
            </ul>
            <p className="mt-4 text-sm text-primary">Can you beat your best combo?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={startGame}>Spin the Chakra</Button>
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
              <div><small>Matches</small><strong>{correct.current}</strong></div>
              <div><small>Lives left</small><strong>{lives.current}</strong></div>
            </div>
            <Button size="lg" className="mt-6" onClick={nextRound}>Continue</Button>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">{lives.current <= 0 ? "The chakra rests" : "The wheel shines"}</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">COLOR CHAKRA COMPLETE!</h1>
            <div className="runner-summary">
              <div><small>Final score</small><strong>{score.current.toLocaleString()}</strong></div>
              <div><small>Best combo</small><strong>x{bestCombo.current}</strong></div>
              <div><small>Correct matches</small><strong>{correct.current} / {TOTAL_OBJECTS}</strong></div>
              <div><small>Mistakes</small><strong>{mistakes.current}</strong></div>
              <div><small>XP earned</small><strong>{(summary?.xp ?? xpEarned).toLocaleString()}</strong></div>
              <div><small>Coins collected</small><strong>{(summary?.coins ?? coinsEarned).toLocaleString()}</strong></div>
            </div>
            {saveError && <p className="mt-4 text-sm text-destructive" role="alert">{saveError}</p>}
            {summary && <p className="mt-4 text-sm text-primary">Profile updated · Level {summary.level} · {summary.completedGames} games completed</p>}
            <p className="mt-4 text-sm text-muted-foreground">Can you beat your best combo?</p>
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
