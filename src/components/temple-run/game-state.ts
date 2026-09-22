export const LANES = [-2.4, 0, 2.4] as const;
export const FINISH_DISTANCE = 1200;
export const CHECKPOINT_EVERY = 300;

export type ObstacleKind = "boulder" | "wall" | "pit" | "beam";
export type PickupKind = "modak" | "star" | "coin";
export type EntityKind = ObstacleKind | PickupKind;

export type PoolItem = {
  active: boolean;
  lane: number;
  z: number;
  spin: number;
};

export function makePool(size: number): PoolItem[] {
  return Array.from({ length: size }, () => ({ active: false, lane: 1, z: 0, spin: 0 }));
}

export type RunStats = {
  distance: number;
  score: number;
  coins: number;
  modaks: number;
  stars: number;
  xp: number;
  health: number;
  checkpoint: number;
  speed: number;
  dodged: number;
  encountered: number;
};

export function createStats(): RunStats {
  return {
    distance: 0,
    score: 0,
    coins: 0,
    modaks: 0,
    stars: 0,
    xp: 0,
    health: 3,
    checkpoint: 0,
    speed: 14,
    dodged: 0,
    encountered: 0,
  };
}

export type Controls = {
  lane: number;
  jumpQueued: boolean;
  slideQueued: boolean;
};
