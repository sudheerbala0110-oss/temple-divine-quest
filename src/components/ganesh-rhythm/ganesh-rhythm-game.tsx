import { Link } from "@tanstack/react-router";
import { Bell, Coins, Flame, Music, Sparkles, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { submitGameResult, type GameResultSummary } from "@/lib/game-result.functions";

type Phase = "intro" | "playing" | "break" | "over";

type Note = { lane: number; time: number; state: "idle" | "hit" | "missed" };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Popup = { text: string; life: number; color: string; lane: number };

const LANES = [
  { name: "Bell", css: "#ffb43d", tone: 523.25 },
  { name: "Conch", css: "#ff5f9e", tone: 659.25 },
  { name: "Drum", css: "#4fd0ff", tone: 783.99 },
  { name: "Chime", css: "#7ce77f", tone: 1046.5 },
];

const ROUNDS = [
  { notes: 8, gap: 0.95, label: "Evening Aarti" },
  { notes: 12, gap: 0.7, label: "Temple Procession" },
  { notes: 16, gap: 0.48, label: "Festival Finale" },
];

const WORLD = { w: 900, h: 1200 };
const TARGET_Y = 940;
const LEAD = 2.1; // seconds a note is visible before reaching the target
const PERFECT_WINDOW = 0.09;
const GOOD_WINDOW = 0.19;
const TOTAL_NOTES = ROUNDS.reduce((sum, round) => sum + round.notes, 0);
const BEST_KEY = "ganesh-rhythm-best";

function laneX(lane: number) {
  const width = WORLD.w / 4;
  return width * lane + width / 2;
}

function makePattern(roundIndex: number) {
  const config = ROUNDS[roundIndex]!;
  const notes: Note[] = [];
  let time = 1.6;
  let previous = -1;
  for (let i = 0; i < config.notes; i += 1) {
    let lane = Math.floor(Math.random() * 4);
    if (lane === previous && Math.random() < 0.7) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4;
    previous = lane;
    notes.push({ lane, time, state: "idle" });
    // Musical variation: occasional syncopated half-beat or held beat.
    const roll = Math.random();
    const step = roll < 0.2 ? config.gap * 0.5 : roll > 0.88 ? config.gap * 1.5 : config.gap;
    time += step;
  }
  return notes;
}

export function GaneshRhythmGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("intro");

  const notes = useRef<Note[]>([]);
  const clock = useRef(0);
  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const pulse = useRef([0, 0, 0, 0]);
  const flash = useRef(0);

  const score = useRef(0);
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const perfect = useRef(0);
  const good = useRef(0);
  const missed = useRef(0);
  const roundIndex = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const hitRef = useRef<(lane: number) => void>(() => {});

  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState({ score: 0, combo: 0, round: 1, left: 0 });
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState("");
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
        combo: combo.current,
        round: roundIndex.current + 1,
        left: notes.current.filter((note) => note.state === "idle").length,
      });
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(""), 700);
    return () => window.clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), 1300);
    return () => window.clearTimeout(id);
  }, [message]);

  const finishGame = useCallback(async () => {
    phaseRef.current = "over";
    setPhase("over");
    const finalScore = score.current;
    if (finalScore > best) {
      setBest(finalScore);
      window.localStorage.setItem(BEST_KEY, String(finalScore));
    }
    const hits = perfect.current + good.current;
    const xpEarned = Math.floor(finalScore / 2) + perfect.current * 6 + bestCombo.current * 10;
    const coinsEarned = hits * 2;
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
    notes.current = makePattern(index);
    clock.current = 0;
    particles.current = [];
    popups.current = [];
    phaseRef.current = "playing";
    setPhase("playing");
    setMessage(`Round ${index + 1} · ${ROUNDS[index]!.label}`);
  }, []);

  const startGame = useCallback(() => {
    score.current = 0;
    combo.current = 0;
    bestCombo.current = 0;
    perfect.current = 0;
    good.current = 0;
    missed.current = 0;
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

    // Original generated temple-bell tone — no licensed audio needed.
    function bell(frequency: number, gainPeak: number) {
      try {
        const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;
        audio.current ??= new AudioCtor();
        const ctx = audio.current;
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const shimmer = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        shimmer.type = "triangle";
        osc.frequency.value = frequency;
        shimmer.frequency.value = frequency * 2.01;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        osc.connect(gain);
        shimmer.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        shimmer.start(now);
        osc.stop(now + 1.15);
        shimmer.stop(now + 1.15);
      } catch {
        // Audio is a bonus; ignore unsupported environments.
      }
    }

    function burst(x: number, y: number, color: string, amount: number) {
      for (let i = 0; i < amount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 380;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          life: 0.35 + Math.random() * 0.55,
          color,
          size: 2 + Math.random() * 5,
        });
      }
      if (particles.current.length > 600) particles.current.splice(0, particles.current.length - 600);
    }

    function hit(lane: number) {
      if (phaseRef.current !== "playing") return;
      pulse.current[lane] = 1;
      const swatch = LANES[lane]!;
      let target: Note | null = null;
      let bestDelta = Infinity;
      for (const note of notes.current) {
        if (note.state !== "idle" || note.lane !== lane) continue;
        const delta = Math.abs(note.time - clock.current);
        if (delta < bestDelta) {
          bestDelta = delta;
          target = note;
        }
      }
      const x = laneX(lane);
      if (!target || bestDelta > GOOD_WINDOW) {
        combo.current = 0;
        setFeedback("Off beat");
        bell(swatch.tone * 0.5, 0.05);
        popups.current.push({ text: "Off beat", life: 0.8, color: "#ff8da3", lane });
        return;
      }
      target.state = "hit";
      combo.current += 1;
      bestCombo.current = Math.max(bestCombo.current, combo.current);
      const isPerfect = bestDelta <= PERFECT_WINDOW;
      const base = isPerfect ? 20 : 10;
      const bonus = combo.current > 1 ? combo.current * 2 : 0;
      score.current += base + bonus;
      if (isPerfect) {
        perfect.current += 1;
        flash.current = 0.22;
        burst(x, TARGET_Y, "#ffe6a7", 34);
        setFeedback("Perfect!");
        popups.current.push({ text: bonus ? `Perfect +${base + bonus}` : "Perfect +20", life: 0.85, color: "#ffe6a7", lane });
      } else {
        good.current += 1;
        burst(x, TARGET_Y, swatch.css, 20);
        setFeedback("Good");
        popups.current.push({ text: bonus ? `Good +${base + bonus}` : "Good +10", life: 0.85, color: swatch.css, lane });
      }
      bell(swatch.tone, isPerfect ? 0.16 : 0.1);
    }
    hitRef.current = hit;

    const keyMap: Record<string, number> = {
      d: 0, f: 1, j: 2, k: 3,
      D: 0, F: 1, J: 2, K: 3,
      ArrowLeft: 0, ArrowUp: 1, ArrowDown: 2, ArrowRight: 3,
      "1": 0, "2": 1, "3": 2, "4": 3,
    };

    function onKey(event: KeyboardEvent) {
      const lane = keyMap[event.key];
      if (lane === undefined || event.repeat) return;
      event.preventDefault();
      hit(lane);
    }

    function onPointer(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const lane = Math.min(3, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * 4)));
      hit(lane);
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    function update(dt: number) {
      if (phaseRef.current === "playing") {
        clock.current += dt;
        let remaining = 0;
        let lastTime = 0;
        for (const note of notes.current) {
          lastTime = Math.max(lastTime, note.time);
          if (note.state !== "idle") continue;
          if (clock.current - note.time > GOOD_WINDOW) {
            note.state = "missed";
            missed.current += 1;
            combo.current = 0;
            setFeedback("Missed");
            popups.current.push({ text: "Miss", life: 0.8, color: "#ff8da3", lane: note.lane });
          } else {
            remaining += 1;
          }
        }
        if (remaining === 0 && clock.current > lastTime + 0.5) {
          if (roundIndex.current >= ROUNDS.length - 1) {
            void finishGame();
          } else {
            phaseRef.current = "break";
            setPhase("break");
          }
        }
      }

      for (let i = 0; i < 4; i += 1) pulse.current[i] = Math.max(0, pulse.current[i]! - dt * 3.4);
      for (const particle of particles.current) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 260 * dt;
        particle.vx *= 0.985;
      }
      particles.current = particles.current.filter((particle) => particle.life > 0);
      for (const popup of popups.current) popup.life -= dt;
      popups.current = popups.current.filter((popup) => popup.life > 0);
      if (flash.current > 0) flash.current -= dt;
    }

    function render() {
      const ctx = context!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.fillStyle = "#07050e";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

      const sky = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      sky.addColorStop(0, "rgba(58, 34, 96, 0.9)");
      sky.addColorStop(0.6, "rgba(20, 13, 34, 0.95)");
      sky.addColorStop(1, "#06040c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      const laneWidth = WORLD.w / 4;
      for (let lane = 0; lane < 4; lane += 1) {
        const swatch = LANES[lane]!;
        const x = laneWidth * lane;
        const glow = ctx.createLinearGradient(0, 0, 0, WORLD.h);
        glow.addColorStop(0, `${swatch.css}05`);
        glow.addColorStop(1, `${swatch.css}22`);
        ctx.fillStyle = glow;
        ctx.fillRect(x + 6, 0, laneWidth - 12, WORLD.h);
        ctx.strokeStyle = "rgba(255, 230, 190, 0.08)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, 0, laneWidth - 12, WORLD.h);
      }

      // Target line.
      ctx.strokeStyle = "rgba(255, 236, 196, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, TARGET_Y);
      ctx.lineTo(WORLD.w, TARGET_Y);
      ctx.stroke();

      // Bells (target pads).
      for (let lane = 0; lane < 4; lane += 1) {
        const swatch = LANES[lane]!;
        const x = laneX(lane);
        const p = pulse.current[lane]!;
        const radius = 66 + p * 18;
        const halo = ctx.createRadialGradient(x, TARGET_Y, 8, x, TARGET_Y, radius * 2);
        halo.addColorStop(0, `${swatch.css}${p > 0.1 ? "cc" : "55"}`);
        halo.addColorStop(1, `${swatch.css}00`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, TARGET_Y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, TARGET_Y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(12, 8, 20, 0.75)";
        ctx.fill();
        ctx.lineWidth = 6 + p * 5;
        ctx.strokeStyle = swatch.css;
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 244, 222, 0.75)";
        ctx.font = "600 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(swatch.name, x, TARGET_Y + 130);
      }

      // Notes.
      for (const note of notes.current) {
        if (note.state !== "idle") continue;
        const progress = 1 - (note.time - clock.current) / LEAD;
        if (progress < -0.05) continue;
        const y = progress * TARGET_Y;
        const x = laneX(note.lane);
        const swatch = LANES[note.lane]!;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 78);
        glow.addColorStop(0, "rgba(255,255,255,0.95)");
        glow.addColorStop(0.35, `${swatch.css}dd`);
        glow.addColorStop(1, `${swatch.css}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 78, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = swatch.css;
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 250, 235, 0.85)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      for (const particle of particles.current) {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const popup of popups.current) {
        ctx.globalAlpha = Math.max(0, popup.life);
        ctx.fillStyle = popup.color;
        ctx.font = "bold 44px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(popup.text, laneX(popup.lane), TARGET_Y - 110 - (0.85 - popup.life) * 110);
        ctx.globalAlpha = 1;
      }

      if (flash.current > 0) {
        ctx.globalAlpha = Math.min(0.32, flash.current);
        ctx.fillStyle = "#ffe9b8";
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

  const hits = perfect.current + good.current;
  const accuracy = TOTAL_NOTES ? Math.round((hits / TOTAL_NOTES) * 100) : 0;
  const xpEarned = Math.floor(score.current / 2) + perfect.current * 6 + bestCombo.current * 10;
  const coinsEarned = hits * 2;

  return (
    <div className="rhythm-stage">
      <canvas ref={canvasRef} className="rhythm-canvas" aria-label="Ganesh Rhythm arena" />

      <div className="runner-hud">
        <div className="runner-hud-row">
          <div className="runner-chip"><Trophy aria-hidden="true" /><span>{hud.score.toLocaleString()}</span><small>Score</small></div>
          <div className="runner-chip"><Music aria-hidden="true" /><span>{hud.round} / 3</span><small>Round</small></div>
          <div className="runner-chip"><Flame aria-hidden="true" /><span>x{hud.combo}</span><small>Combo</small></div>
          <div className="runner-chip"><Sparkles aria-hidden="true" /><span>{hud.left}</span><small>Notes left</small></div>
          <div className="runner-chip"><Coins aria-hidden="true" /><span>{best.toLocaleString()}</span><small>Best</small></div>
        </div>
      </div>

      {feedback && <p className="runner-flash">{feedback}</p>}
      {message && !feedback && <p className="runner-flash">{message}</p>}

      {phase === "playing" && (
        <>
          <div className="rhythm-pads" aria-label="Rhythm buttons">
            {LANES.map((lane, index) => (
              <button
                key={lane.name}
                type="button"
                className="rhythm-pad"
                style={{ ["--pad" as string]: lane.css }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  hitRef.current(index);
                }}
              >
                <Bell aria-hidden="true" />
                <span>{lane.name}</span>
              </button>
            ))}
          </div>
          <p className="aim-hint">Tap a bell as its light lands · keys D F J K</p>
        </>
      )}

      {phase === "intro" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">Chapter Four</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">Ganesh Rhythm</h1>
            <p className="mt-3 text-muted-foreground">
              Four temple bells glow in the dark. Strike each one the moment its light touches the ring — eight notes,
              then twelve, then sixteen, each pattern quicker than the last.
            </p>
            <ul className="runner-keys">
              <li><b>Tap</b> a bell (or its side of the screen)</li>
              <li><b>D F J K</b> or arrow keys on a keyboard</li>
              <li><b>Perfect</b> +20 · <b>Good</b> +10 · a miss breaks your combo</li>
            </ul>
            <p className="mt-4 text-sm text-primary">Can you keep a flawless combo?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={startGame}>Ring the Bells</Button>
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
              <div><small>Perfect hits</small><strong>{perfect.current}</strong></div>
              <div><small>Missed</small><strong>{missed.current}</strong></div>
            </div>
            <Button size="lg" className="mt-6" onClick={nextRound}>Continue</Button>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="runner-overlay">
          <div className="runner-panel animate-rise">
            <p className="game-kicker">The bells fall silent</p>
            <h1 className="font-display text-3xl font-semibold sm:text-5xl">RHYTHM MASTER!</h1>
            <div className="runner-summary">
              <div><small>Final score</small><strong>{score.current.toLocaleString()}</strong></div>
              <div><small>Highest combo</small><strong>x{bestCombo.current}</strong></div>
              <div><small>Perfect hits</small><strong>{perfect.current}</strong></div>
              <div><small>Accuracy</small><strong>{accuracy}%</strong></div>
              <div><small>Best score</small><strong>{Math.max(best, score.current).toLocaleString()}</strong></div>
              <div><small>XP earned</small><strong>{(summary?.xp ?? xpEarned).toLocaleString()}</strong></div>
              <div><small>Coins collected</small><strong>{(summary?.coins ?? coinsEarned).toLocaleString()}</strong></div>
            </div>
            {saveError && <p className="mt-4 text-sm text-destructive" role="alert">{saveError}</p>}
            {summary && <p className="mt-4 text-sm text-primary">Profile updated · Level {summary.level} · {summary.completedGames} games completed</p>}
            <p className="mt-4 text-sm text-muted-foreground">Every replay writes a fresh rhythm — can you beat your best?</p>
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
