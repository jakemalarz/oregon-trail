import type { GameState, Landmark } from './types';
import type { Rng } from './rng';
import { aliveMembers } from './state';

export type CrossMethod = 'ford' | 'caulk' | 'ferry' | 'wait';

export interface CrossResult {
  method: CrossMethod;
  success: boolean;
  message: string;
  daysTaken: number;
  capsized: boolean;
}

export const FERRY_COST = 5;

export function crossRiver(
  state: GameState,
  river: Landmark,
  method: CrossMethod,
  rng: Rng,
): CrossResult {
  const depth = river.riverDepth ?? 2;

  if (method === 'wait') {
    return {
      method,
      success: false,
      message: 'You wait a day. The river drops slightly.',
      daysTaken: 1,
      capsized: false,
    };
  }

  if (method === 'ferry') {
    if (!river.ferry) {
      return {
        method,
        success: false,
        message: 'There is no ferry at this river.',
        daysTaken: 0,
        capsized: false,
      };
    }
    if (state.money < FERRY_COST) {
      return {
        method,
        success: false,
        message: `The ferry costs $${FERRY_COST}. You can't afford it.`,
        daysTaken: 0,
        capsized: false,
      };
    }
    state.money -= FERRY_COST;
    return {
      method,
      success: true,
      message: 'You take the ferry across safely.',
      daysTaken: 1,
      capsized: false,
    };
  }

  if (method === 'ford') {
    if (depth < 2.5) {
      return {
        method,
        success: true,
        message: 'You ford the river successfully.',
        daysTaken: 1,
        capsized: false,
      };
    }
    const fail = rng.chance(Math.min(0.9, (depth - 2.5) * 0.4 + 0.2));
    if (fail) {
      const lostFood = Math.min(state.inventory.food, Math.floor(rng.int(40) + 20));
      state.inventory.food -= lostFood;
      const lostClothing = Math.min(state.inventory.clothing, rng.int(2));
      state.inventory.clothing -= lostClothing;
      return {
        method,
        success: false,
        message: `Your wagon tips while fording! You lost ${lostFood} lbs of food and ${lostClothing} clothing.`,
        daysTaken: 1,
        capsized: true,
      };
    }
    return {
      method,
      success: true,
      message: 'You ford the river. It was difficult.',
      daysTaken: 1,
      capsized: false,
    };
  }

  // caulk
  if (depth > 6) {
    if (rng.chance(0.5)) {
      const drowned = rng.pick(aliveMembers(state).map((m) => m.name));
      const member = state.party.find((p) => p.name === drowned);
      if (member) {
        member.alive = false;
        member.health = 0;
      }
      state.inventory.food = Math.max(0, state.inventory.food - 50);
      return {
        method,
        success: false,
        message: `Your wagon capsized! ${drowned} drowned and supplies were lost.`,
        daysTaken: 2,
        capsized: true,
      };
    }
  }
  return {
    method,
    success: true,
    message: 'You caulk the wagon and float across.',
    daysTaken: 2,
    capsized: false,
  };
}
