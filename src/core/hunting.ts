import type { GameState } from './types';
import type { Rng } from './rng';

export type Animal = 'rabbit' | 'deer' | 'buffalo' | 'bear';

export const ANIMAL_MEAT: Record<Animal, number> = {
  rabbit: 2,
  deer: 50,
  buffalo: 350,
  bear: 100,
};

export const ANIMAL_SPAWN_WEIGHT: Record<Animal, number> = {
  rabbit: 8,
  deer: 5,
  buffalo: 2,
  bear: 1,
};

export const HUNT_CARRY_CAP = 100;
export const SHOT_AMMO_COST = 1;

export interface HuntResult {
  animalsKilled: number;
  meatGained: number;
  ammoUsed: number;
}

export function pickAnimal(rng: Rng): Animal {
  const animals: Animal[] = ['rabbit', 'deer', 'buffalo', 'bear'];
  const weights = animals.map((a) => ANIMAL_SPAWN_WEIGHT[a]);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.int(total);
  for (let i = 0; i < animals.length; i++) {
    if (r < weights[i]) return animals[i];
    r -= weights[i];
  }
  return 'rabbit';
}

export function applyHunt(
  state: GameState,
  killed: Animal[],
  shotsFired: number,
): HuntResult {
  const ammoUsed = Math.min(shotsFired * SHOT_AMMO_COST, state.inventory.ammunition);
  state.inventory.ammunition -= ammoUsed;
  const totalMeat = killed.reduce((s, a) => s + ANIMAL_MEAT[a], 0);
  const meatGained = Math.min(totalMeat, HUNT_CARRY_CAP);
  state.inventory.food += meatGained;
  return { animalsKilled: killed.length, meatGained, ammoUsed };
}

export function canHunt(state: GameState): { ok: boolean; reason?: string } {
  if (state.inventory.ammunition < SHOT_AMMO_COST) {
    return { ok: false, reason: 'You have no ammunition.' };
  }
  return { ok: true };
}
