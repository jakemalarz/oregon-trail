export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;

  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive);
    },
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
    chance(p: number): boolean {
      return next() < p;
    },
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('pick: empty array');
      return arr[Math.floor(next() * arr.length)];
    },
    state(): number {
      return s;
    },
  };
}
