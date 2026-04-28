import type { Environment, GameState } from './types';
import type { Rng } from './rng';
import { ANIMALS, pickAnimalForEnvironment, type AnimalId } from './animals';

export type Animal = AnimalId;

export const ANIMAL_MEAT: Record<AnimalId, number> = (() => {
  const out: Partial<Record<AnimalId, number>> = {};
  for (const a of Object.values(ANIMALS)) out[a.id] = a.meatLbs;
  return out as Record<AnimalId, number>;
})();

export const HUNT_CARRY_CAP = 200;
export const SHOT_AMMO_COST = 1;

export interface HuntResult {
  animalsKilled: number;
  meatGained: number;
  ammoUsed: number;
  partyDamage: number;
}

export function pickAnimal(rng: Rng, env: Environment = 'plains'): AnimalId {
  return pickAnimalForEnvironment(rng, env).id;
}

export function applyHunt(
  state: GameState,
  killed: AnimalId[],
  shotsFired: number,
  partyDamage = 0,
): HuntResult {
  const ammoUsed = Math.min(shotsFired * SHOT_AMMO_COST, state.inventory.ammunition);
  state.inventory.ammunition -= ammoUsed;
  const totalMeat = killed.reduce((s, a) => s + ANIMAL_MEAT[a], 0);
  const meatGained = Math.min(totalMeat, HUNT_CARRY_CAP);
  state.inventory.food += meatGained;

  if (partyDamage > 0) {
    const alive = state.party.filter((m) => m.alive);
    if (alive.length > 0) {
      const per = Math.ceil(partyDamage / alive.length);
      for (const m of alive) m.health = Math.max(0, m.health - per);
    }
  }
  return { animalsKilled: killed.length, meatGained, ammoUsed, partyDamage };
}

export function canHunt(state: GameState): { ok: boolean; reason?: string } {
  if (state.inventory.ammunition < SHOT_AMMO_COST) {
    return { ok: false, reason: 'You have no ammunition.' };
  }
  return { ok: true };
}
