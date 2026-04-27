import type { GameState } from './types';
import type { Rng } from './rng';
import { aliveMembers } from './state';
import { inflictIllness, pickRandomIllness } from './illness';

export type EventId =
  | 'none'
  | 'illness'
  | 'snakebite'
  | 'brokenWheel'
  | 'brokenAxle'
  | 'brokenTongue'
  | 'oxInjured'
  | 'oxDied'
  | 'theft'
  | 'badWater'
  | 'littleWater'
  | 'littleGrass'
  | 'heavyFog'
  | 'heavyRain'
  | 'hailStorm'
  | 'wildAnimals'
  | 'lostTrail'
  | 'wagonFire'
  | 'wrongTurn'
  | 'fruitFound'
  | 'helpfulIndians'
  | 'abandonedWagon';

export interface EventOutcome {
  id: EventId;
  message: string;
}

export interface EventDef {
  id: EventId;
  weight: number;
  apply: (state: GameState, rng: Rng) => string;
}

const EVENT_DEFS: EventDef[] = [
  {
    id: 'illness',
    weight: 12,
    apply: (state, rng) => {
      const alive = aliveMembers(state);
      if (alive.length === 0) return '';
      const target = rng.pick(alive);
      const illness = pickRandomIllness(rng);
      inflictIllness(target, illness);
      return `${target.name} has ${illness}.`;
    },
  },
  {
    id: 'snakebite',
    weight: 3,
    apply: (state, rng) => {
      const alive = aliveMembers(state);
      if (alive.length === 0) return '';
      const target = rng.pick(alive);
      inflictIllness(target, 'snake bite');
      return `${target.name} was bitten by a snake.`;
    },
  },
  {
    id: 'brokenWheel',
    weight: 6,
    apply: (state) => {
      if (state.inventory.wheels > 0) {
        state.inventory.wheels -= 1;
        return 'A wagon wheel broke. You replaced it with a spare.';
      }
      state.wagon.wheels = Math.max(0, state.wagon.wheels - 1);
      return 'A wagon wheel broke and you have no spare!';
    },
  },
  {
    id: 'brokenAxle',
    weight: 4,
    apply: (state) => {
      if (state.inventory.axles > 0) {
        state.inventory.axles -= 1;
        return 'A wagon axle broke. You replaced it with a spare.';
      }
      state.wagon.axles = Math.max(0, state.wagon.axles - 1);
      return 'A wagon axle broke and you have no spare!';
    },
  },
  {
    id: 'brokenTongue',
    weight: 3,
    apply: (state) => {
      if (state.inventory.tongues > 0) {
        state.inventory.tongues -= 1;
        return 'A wagon tongue broke. You replaced it with a spare.';
      }
      state.wagon.tongues = Math.max(0, state.wagon.tongues - 1);
      return 'A wagon tongue broke and you have no spare!';
    },
  },
  {
    id: 'oxInjured',
    weight: 4,
    apply: (state) => {
      if (state.inventory.oxen <= 2) return 'An ox was injured but recovered.';
      state.inventory.oxen -= 1;
      return 'An ox was injured.';
    },
  },
  {
    id: 'oxDied',
    weight: 2,
    apply: (state) => {
      if (state.inventory.oxen <= 0) return '';
      state.inventory.oxen -= 1;
      return 'One of your oxen has died.';
    },
  },
  {
    id: 'theft',
    weight: 3,
    apply: (state, rng) => {
      const stolen = rng.int(20) + 5;
      const food = Math.min(state.inventory.food, stolen);
      state.inventory.food -= food;
      return `Thieves stole ${food} pounds of food.`;
    },
  },
  {
    id: 'badWater',
    weight: 4,
    apply: (state, rng) => {
      const alive = aliveMembers(state);
      if (alive.length === 0) return '';
      const target = rng.pick(alive);
      target.health = Math.max(0, target.health - 10);
      return `Bad water: ${target.name} is sick.`;
    },
  },
  {
    id: 'littleWater',
    weight: 4,
    apply: () => 'There is very little water here.',
  },
  {
    id: 'littleGrass',
    weight: 4,
    apply: () => 'The grass is sparse here. Oxen are weakened.',
  },
  {
    id: 'heavyFog',
    weight: 3,
    apply: () => 'Heavy fog slows your travel.',
  },
  {
    id: 'heavyRain',
    weight: 4,
    apply: (state) => {
      const lost = Math.min(state.inventory.food, 5);
      state.inventory.food -= lost;
      return `Heavy rains. ${lost} pounds of food spoiled.`;
    },
  },
  {
    id: 'hailStorm',
    weight: 2,
    apply: (state) => {
      const lost = Math.min(state.inventory.clothing, 1);
      state.inventory.clothing -= lost;
      return 'A hail storm damages your supplies.';
    },
  },
  {
    id: 'wildAnimals',
    weight: 3,
    apply: (state, rng) => {
      const ammoLost = Math.min(state.inventory.ammunition, rng.int(40) + 10);
      state.inventory.ammunition -= ammoLost;
      return `Wild animals attacked! You used ${ammoLost} bullets.`;
    },
  },
  {
    id: 'lostTrail',
    weight: 3,
    apply: () => 'You lost the trail. You lost 2 days.',
  },
  {
    id: 'wagonFire',
    weight: 2,
    apply: (state) => {
      const food = Math.min(state.inventory.food, 25);
      state.inventory.food -= food;
      const ammo = Math.min(state.inventory.ammunition, 10);
      state.inventory.ammunition -= ammo;
      return 'A fire in your wagon! You lost food and ammunition.';
    },
  },
  {
    id: 'wrongTurn',
    weight: 2,
    apply: () => 'You took a wrong turn and lost time.',
  },
  {
    id: 'fruitFound',
    weight: 3,
    apply: (state, rng) => {
      const found = rng.int(15) + 5;
      state.inventory.food += found;
      return `You found wild fruit. +${found} pounds of food.`;
    },
  },
  {
    id: 'helpfulIndians',
    weight: 3,
    apply: (state, rng) => {
      const food = rng.int(20) + 10;
      state.inventory.food += food;
      return `Friendly Indians give you ${food} pounds of food.`;
    },
  },
  {
    id: 'abandonedWagon',
    weight: 3,
    apply: (state) => {
      state.inventory.clothing += 2;
      return 'You found an abandoned wagon. +2 sets of clothing.';
    },
  },
];

const TOTAL_WEIGHT = EVENT_DEFS.reduce((s, e) => s + e.weight, 0);

export function rollEvent(state: GameState, rng: Rng): EventOutcome {
  if (!rng.chance(0.35)) return { id: 'none', message: '' };
  let r = rng.int(TOTAL_WEIGHT);
  for (const def of EVENT_DEFS) {
    if (r < def.weight) {
      const message = def.apply(state, rng);
      return { id: def.id, message };
    }
    r -= def.weight;
  }
  return { id: 'none', message: '' };
}

export function listEvents(): readonly EventDef[] {
  return EVENT_DEFS;
}
