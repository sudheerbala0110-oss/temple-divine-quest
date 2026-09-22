import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

import {
  CHECKPOINT_EVERY,
  FINISH_DISTANCE,
  LANES,
  makePool,
  type Controls,
  type ObstacleKind,
  type PoolItem,
  type RunStats,
} from "./game-state";

type SceneProps = {
  stats: RefObject<RunStats>;
  controls: RefObject<Controls>;
  running: RefObject<boolean>;
  onEnd: (outcome: "complete" | "failed") => void;
  onFlash: (message: string) => void;
};

const SEGMENT_LENGTH = 24;
const SEGMENT_COUNT = 8;
const SPAWN_Z = -140;

function makeStoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3b3226";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    const shade = 30 + Math.random() * 40;
    ctx.fillStyle = `rgba(${shade + 40},${shade + 28},${shade + 10},0.5)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  ctx.strokeStyle = "rgba(214,178,96,0.35)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 8);
  return texture;
}

export function TempleScene({ stats, controls, running, onEnd, onFlash }: SceneProps) {
  const { camera } = useThree();
  const floorTexture = useMemo(makeStoneTexture, []);

  const playerRef = useRef<THREE.Group>(null);
  const legLeft = useRef<THREE.Mesh>(null);
  const legRight = useRef<THREE.Mesh>(null);
  const segments = useRef<(THREE.Group | null)[]>([]);

  const pools = useMemo(
    () => ({
      boulder: makePool(8),
      wall: makePool(8),
      pit: makePool(8),
      beam: makePool(6),
      modak: makePool(10),
      star: makePool(8),
      coin: makePool(18),
    }),
    [],
  );
  const meshes = useRef<Record<string, (THREE.Group | null)[]>>({});

  const player = useRef({ x: 0, y: 0, vy: 0, slide: 0, invuln: 0, shake: 0, bob: 0 });
  const nextSpawn = useRef(-40);
  const ended = useRef(false);

  function spawnRow() {
    const laneChoice = Math.floor(Math.random() * 3);
    const kinds: ObstacleKind[] = ["boulder", "wall", "pit", "beam"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    const obstacles = pools[kind];
    const free = obstacles.find((item) => !item.active);
    if (free) {
      free.active = true;
      free.lane = laneChoice;
      free.z = SPAWN_Z;
      stats.current!.encountered += 1;
    }

    // Reward the safe lanes with pickups.
    for (let lane = 0; lane < 3; lane += 1) {
      if (lane === laneChoice) continue;
      const roll = Math.random();
      const poolName = roll > 0.82 ? "star" : roll > 0.55 ? "modak" : "coin";
      const pool = pools[poolName];
      const slot = pool.find((item) => !item.active);
      if (slot && Math.random() > 0.28) {
        slot.active = true;
        slot.lane = lane;
        slot.z = SPAWN_Z - Math.random() * 6;
      }
    }
  }

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const run = stats.current!;
    const ctrl = controls.current!;
    const p = player.current;
    const isRunning = running.current === true;

    if (isRunning) {
      run.speed = Math.min(32, run.speed + dt * 0.55);
      run.distance += run.speed * dt;
      run.score = Math.floor(run.distance / 2) + run.modaks * 5 + run.stars * 10 + run.coins * 2;

      const checkpoint = Math.floor(run.distance / CHECKPOINT_EVERY);
      if (checkpoint > run.checkpoint) {
        run.checkpoint = checkpoint;
        run.health = Math.min(3, run.health + 1);
        onFlash(`Checkpoint ${checkpoint} reached`);
      }

      if (run.distance >= FINISH_DISTANCE && !ended.current) {
        ended.current = true;
        onEnd("complete");
      }

      if (run.distance > -nextSpawn.current) {
        nextSpawn.current -= 11 + Math.random() * 8;
        spawnRow();
      }
    }

    // Player lateral + vertical motion.
    const targetX = LANES[ctrl.lane] ?? 0;
    p.x += (targetX - p.x) * (1 - Math.exp(-14 * dt));

    if (ctrl.jumpQueued) {
      ctrl.jumpQueued = false;
      if (p.y <= 0.01) {
        p.vy = 9.2;
        p.slide = 0;
      }
    }
    if (ctrl.slideQueued) {
      ctrl.slideQueued = false;
      if (p.y <= 0.01) p.slide = 0.6;
    }
    if (p.slide > 0) p.slide = Math.max(0, p.slide - dt);

    p.vy -= 24 * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    if (p.y === 0) p.vy = 0;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shake > 0) p.shake = Math.max(0, p.shake - dt * 2.4);

    const airborne = p.y > 0.7;
    const sliding = p.slide > 0;

    if (playerRef.current) {
      playerRef.current.position.set(p.x, p.y + (sliding ? -0.35 : 0), 0);
      playerRef.current.scale.set(1, sliding ? 0.55 : 1, 1);
      p.bob += dt * (isRunning ? run.speed * 0.9 : 3);
      playerRef.current.position.y += Math.abs(Math.sin(p.bob)) * 0.08;
      playerRef.current.rotation.z = (targetX - p.x) * 0.12;
      const swing = Math.sin(p.bob * 2) * 0.7;
      if (legLeft.current) legLeft.current.rotation.x = swing;
      if (legRight.current) legRight.current.rotation.x = -swing;
      playerRef.current.visible = p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0;
    }

    // Scroll the corridor.
    if (isRunning) {
      segments.current.forEach((segment) => {
        if (!segment) return;
        segment.position.z += run.speed * dt;
        if (segment.position.z > SEGMENT_LENGTH) segment.position.z -= SEGMENT_LENGTH * SEGMENT_COUNT;
      });
      floorTexture.offset.y -= run.speed * dt * 0.02;
    }

    // Entities.
    (Object.keys(pools) as (keyof typeof pools)[]).forEach((key) => {
      const pool: PoolItem[] = pools[key];
      const group = meshes.current[key] ?? [];
      pool.forEach((item, index) => {
        const mesh = group[index];
        if (!mesh) return;
        if (!item.active) {
          mesh.visible = false;
          return;
        }
        if (isRunning) item.z += run.speed * dt;
        item.spin += dt * 2.4;
        mesh.visible = true;
        mesh.position.set(LANES[item.lane] ?? 0, mesh.userData['baseY'] ?? 0, item.z);
        if (key === "modak" || key === "star" || key === "coin") {
          mesh.rotation.y = item.spin;
          mesh.position.y += Math.sin(item.spin * 1.6) * 0.12;
        } else if (key === "boulder") {
          mesh.rotation.x = -item.z * 0.4;
        }

        const near = Math.abs(item.z) < 1.15 && item.lane === ctrl.lane;
        if (near && isRunning && !ended.current) {
          if (key === "coin" || key === "modak" || key === "star") {
            item.active = false;
            mesh.visible = false;
            if (key === "coin") run.coins += 1;
            if (key === "modak") run.modaks += 1;
            if (key === "star") {
              run.stars += 1;
              run.xp += 25;
            }
          } else {
            const safe = (key === "wall" || key === "pit") && airborne ? true : key === "beam" && sliding;
            if (!safe && p.invuln <= 0) {
              run.health -= 1;
              p.invuln = 1.3;
              p.shake = 1;
              item.active = false;
              mesh.visible = false;
              onFlash(run.health > 0 ? "Ouch! Stay alert" : "The quest ends here");
              if (run.health <= 0 && !ended.current) {
                ended.current = true;
                onEnd("failed");
              }
            } else if (safe) {
              run.dodged += 1;
              item.active = false;
              mesh.visible = false;
            }
          }
        }
        if (item.z > 9) {
          item.active = false;
          mesh.visible = false;
          if (key === "boulder" || key === "wall" || key === "pit" || key === "beam") run.dodged += 1;
        }
      });
    });

    // Camera follow with a little shake on impact.
    const shake = p.shake * 0.18;
    camera.position.x += (p.x * 0.55 - camera.position.x) * (1 - Math.exp(-6 * dt));
    camera.position.y = 3.4 + Math.sin(state.clock.elapsedTime * 9) * shake;
    camera.position.z = 7.2;
    camera.lookAt(p.x * 0.5, 1.4 + p.y * 0.4, -8);
  });

  const registerMesh = (key: string, index: number) => (node: THREE.Group | null) => {
    meshes.current[key] = meshes.current[key] ?? [];
    meshes.current[key]![index] = node;
  };

  return (
    <>
      <color attach="background" args={["#120c14"]} />
      <fog attach="fog" args={["#170f18", 22, 105]} />
      <ambientLight intensity={0.5} color="#ffd9a0" />
      <hemisphereLight args={["#ffd9a0", "#2a1c2e", 0.6]} />
      <directionalLight
        position={[6, 14, 6]}
        intensity={1.7}
        color="#ffca7a"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 4, 2]} intensity={22} color="#ffb457" distance={16} />
      <Environment>
        <Lightformer intensity={1.8} color="#ffd9a0" position={[0, 6, -6]} scale={[12, 6, 1]} />
        <Lightformer intensity={0.8} color="#7fd8ff" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[18, 3, 1]} />
      </Environment>

      {/* Corridor segments */}
      {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(node) => {
            segments.current[i] = node;
          }}
          position={[0, 0, -i * SEGMENT_LENGTH]}
        >
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[9, SEGMENT_LENGTH]} />
            <meshStandardMaterial map={floorTexture} color="#b99a63" roughness={0.85} metalness={0.05} />
          </mesh>
          {[-4.5, 4.5].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 3, 0]} castShadow>
                <boxGeometry args={[1.1, 6, SEGMENT_LENGTH]} />
                <meshStandardMaterial color="#5c4630" roughness={0.9} />
              </mesh>
              {[-8, 0, 8].map((z) => (
                <group key={z} position={[0, 0, z]}>
                  <mesh position={[0, 2.2, 0]} castShadow>
                    <cylinderGeometry args={[0.62, 0.72, 4.4, 10]} />
                    <meshStandardMaterial color="#c9a76b" roughness={0.6} metalness={0.25} />
                  </mesh>
                  <mesh position={[0, 4.6, 0]}>
                    <boxGeometry args={[1.6, 0.5, 1.6]} />
                    <meshStandardMaterial color="#e0bf7d" roughness={0.4} metalness={0.4} />
                  </mesh>
                  <mesh position={[x > 0 ? -0.7 : 0.7, 2.6, 0]}>
                    <sphereGeometry args={[0.22, 10, 10]} />
                    <meshStandardMaterial color="#ffca7a" emissive="#ff9c3c" emissiveIntensity={2.4} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          <mesh position={[0, 6.6, 0]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[9, SEGMENT_LENGTH]} />
            <meshStandardMaterial color="#2a1f2c" roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Player */}
      <group ref={playerRef} position={[0, 0, 0]}>
        <mesh position={[0, 1.05, 0]} castShadow>
          <capsuleGeometry args={[0.42, 0.75, 6, 14]} />
          <meshStandardMaterial color="#f0a93c" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <sphereGeometry args={[0.46, 18, 18]} />
          <meshStandardMaterial color="#f6c56b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.82, 0.42]} rotation-x={0.7}>
          <capsuleGeometry args={[0.11, 0.5, 4, 10]} />
          <meshStandardMaterial color="#f6c56b" roughness={0.4} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 1.95, 0]} rotation-y={x > 0 ? -0.3 : 0.3}>
            <circleGeometry args={[0.26, 14]} />
            <meshStandardMaterial color="#eab567" side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 2.42, 0]}>
          <coneGeometry args={[0.26, 0.42, 12]} />
          <meshStandardMaterial color="#ffd782" emissive="#ffae42" emissiveIntensity={1.3} metalness={0.6} />
        </mesh>
        <mesh ref={legLeft} position={[-0.2, 0.38, 0]} castShadow>
          <capsuleGeometry args={[0.14, 0.42, 4, 8]} />
          <meshStandardMaterial color="#c8752b" />
        </mesh>
        <mesh ref={legRight} position={[0.2, 0.38, 0]} castShadow>
          <capsuleGeometry args={[0.14, 0.42, 4, 8]} />
          <meshStandardMaterial color="#c8752b" />
        </mesh>
        <pointLight position={[0, 1.6, 0.6]} intensity={6} color="#ffcf8a" distance={6} />
      </group>

      {/* Obstacles */}
      {pools.boulder.map((_, i) => (
        <group key={`boulder-${i}`} ref={registerMesh("boulder", i)} visible={false} userData={{ baseY: 0.95 }}>
          <mesh castShadow>
            <dodecahedronGeometry args={[0.95, 0]} />
            <meshStandardMaterial color="#6f5f52" roughness={1} />
          </mesh>
        </group>
      ))}
      {pools.wall.map((_, i) => (
        <group key={`wall-${i}`} ref={registerMesh("wall", i)} visible={false} userData={{ baseY: 0.45 }}>
          <mesh castShadow>
            <boxGeometry args={[1.9, 0.9, 0.5]} />
            <meshStandardMaterial color="#7a5a37" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2, 0.12, 0.6]} />
            <meshStandardMaterial color="#ffca7a" emissive="#ff8a3c" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
      {pools.pit.map((_, i) => (
        <group key={`pit-${i}`} ref={registerMesh("pit", i)} visible={false} userData={{ baseY: 0.06 }}>
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[2, 2.4]} />
            <meshStandardMaterial color="#ff5722" emissive="#ff3b16" emissiveIntensity={2.2} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.7, 1.5, 10]} />
            <meshStandardMaterial color="#ff8f3a" emissive="#ff5a12" emissiveIntensity={2} transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
      {pools.beam.map((_, i) => (
        <group key={`beam-${i}`} ref={registerMesh("beam", i)} visible={false} userData={{ baseY: 1.85 }}>
          <mesh castShadow>
            <boxGeometry args={[2, 0.35, 0.35]} />
            <meshStandardMaterial color="#8fe6ff" emissive="#38c7ff" emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}

      {/* Pickups */}
      {pools.modak.map((_, i) => (
        <group key={`modak-${i}`} ref={registerMesh("modak", i)} visible={false} userData={{ baseY: 1.1 }}>
          <mesh castShadow>
            <coneGeometry args={[0.34, 0.6, 12]} />
            <meshStandardMaterial color="#ffe0a8" emissive="#ffb45c" emissiveIntensity={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {pools.star.map((_, i) => (
        <group key={`star-${i}`} ref={registerMesh("star", i)} visible={false} userData={{ baseY: 1.5 }}>
          <mesh castShadow>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color="#bff0ff" emissive="#4fd2ff" emissiveIntensity={2.4} metalness={0.5} />
          </mesh>
          <pointLight intensity={4} color="#6fe0ff" distance={5} />
        </group>
      ))}
      {pools.coin.map((_, i) => (
        <group key={`coin-${i}`} ref={registerMesh("coin", i)} visible={false} userData={{ baseY: 1.2 }} rotation-x={Math.PI / 2}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 16]} />
            <meshStandardMaterial color="#ffd15c" emissive="#ffa42c" emissiveIntensity={1.1} metalness={0.8} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </>
  );
}
