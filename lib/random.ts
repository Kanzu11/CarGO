/**
 * Mulberry32 deterministic 32-bit PRNG.
 * Guarantees reproducible fleet spawns across reloads and tests.
 */
export type Prng = () => number;

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string hash -> uint32 seed. */
export function hashSeed(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export function pickRandom<T>(items: ReadonlyArray<T>, rng: Prng): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty array");
  }
  const index = Math.floor(rng() * items.length);
  return items[Math.min(items.length - 1, index)]!;
}

export function randomBetween(min: number, max: number, rng: Prng): number {
  return min + (max - min) * rng();
}
