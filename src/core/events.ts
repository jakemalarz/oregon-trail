import type { Environment, GameState } from './types';
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
  | 'abandonedWagon'
  | 'thunderstorm'
  | 'wagonStuck'
  | 'rattlesnake'
  | 'wolfAttack'
  | 'bearEncounter'
  | 'buffaloHerd'
  | 'memberLost'
  | 'memberFound'
  | 'sandstorm'
  | 'hotSprings'
  | 'avalancheRisk'
  | 'fallenTree'
  | 'mosquitoes'
  | 'altitude'
  | 'graveyard'
  | 'helpfulFort'
  | 'tradingParty'
  | 'sweetWater'
  | 'lostOx'
  | 'broken-bucket';

export interface EventOutcome {
  id: EventId;
  message: string;
}

export type EnvWeights = Partial<Record<Environment, number>>;

export interface EventDef {
  id: EventId;
  weight: number;
  whereWeight?: EnvWeights;
  apply: (state: GameState, rng: Rng) => string;
}

const EVENT_DEFS: EventDef[] = [
  {
    id: 'illness',
    weight: 12,
    whereWeight: { 'river-valley': 16, desert: 14 },
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
    whereWeight: { plains: 4, desert: 6, forest: 1 },
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
    whereWeight: { mountains: 9, forest: 8 },
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
    whereWeight: { mountains: 6 },
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
    whereWeight: { mountains: 5 },
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
    whereWeight: { mountains: 6, desert: 5 },
    apply: (state) => {
      if (state.inventory.oxen <= 2) return 'An ox was injured but recovered.';
      state.inventory.oxen -= 1;
      return 'An ox was injured.';
    },
  },
  {
    id: 'oxDied',
    weight: 2,
    whereWeight: { desert: 4, mountains: 3 },
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
    whereWeight: { desert: 7, 'river-valley': 5 },
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
    whereWeight: { desert: 9, plains: 5, 'river-valley': 1 },
    apply: () => 'There is very little water here.',
  },
  {
    id: 'littleGrass',
    weight: 4,
    whereWeight: { desert: 8, mountains: 6 },
    apply: () => 'The grass is sparse here. Oxen are weakened.',
  },
  {
    id: 'heavyFog',
    weight: 3,
    whereWeight: { 'river-valley': 6, forest: 5, mountains: 4 },
    apply: () => 'Heavy fog slows your travel.',
  },
  {
    id: 'heavyRain',
    weight: 4,
    whereWeight: { plains: 5, forest: 6, 'river-valley': 5 },
    apply: (state) => {
      const lost = Math.min(state.inventory.food, 5);
      state.inventory.food -= lost;
      return `Heavy rains. ${lost} pounds of food spoiled.`;
    },
  },
  {
    id: 'hailStorm',
    weight: 2,
    whereWeight: { plains: 4, mountains: 3 },
    apply: (state) => {
      const lost = Math.min(state.inventory.clothing, 1);
      state.inventory.clothing -= lost;
      return 'A hail storm damages your supplies.';
    },
  },
  {
    id: 'wildAnimals',
    weight: 3,
    whereWeight: { forest: 5, mountains: 5, plains: 4 },
    apply: (state, rng) => {
      const ammoLost = Math.min(state.inventory.ammunition, rng.int(40) + 10);
      state.inventory.ammunition -= ammoLost;
      return `Wild animals attacked! You used ${ammoLost} bullets.`;
    },
  },
  {
    id: 'lostTrail',
    weight: 3,
    whereWeight: { mountains: 5, forest: 4, desert: 4 },
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
    whereWeight: { mountains: 4, forest: 3 },
    apply: () => 'You took a wrong turn and lost time.',
  },
  {
    id: 'fruitFound',
    weight: 3,
    whereWeight: { forest: 6, plains: 4, 'river-valley': 4, desert: 0 },
    apply: (state, rng) => {
      const found = rng.int(15) + 5;
      state.inventory.food += found;
      return `You found wild fruit. +${found} pounds of food.`;
    },
  },
  {
    id: 'helpfulIndians',
    weight: 3,
    whereWeight: { plains: 5, 'river-valley': 4 },
    apply: (state, rng) => {
      const food = rng.int(20) + 10;
      state.inventory.food += food;
      return `Friendly Indians give you ${food} pounds of food.`;
    },
  },
  {
    id: 'abandonedWagon',
    weight: 3,
    whereWeight: { plains: 5, mountains: 4 },
    apply: (state) => {
      state.inventory.clothing += 2;
      return 'You found an abandoned wagon. +2 sets of clothing.';
    },
  },
  {
    id: 'thunderstorm',
    weight: 3,
    whereWeight: { plains: 6, 'river-valley': 5 },
    apply: (state) => {
      const lost = Math.min(state.inventory.food, 8);
      state.inventory.food -= lost;
      return `A violent thunderstorm. ${lost} pounds of food spoiled.`;
    },
  },
  {
    id: 'wagonStuck',
    weight: 3,
    whereWeight: { 'river-valley': 6, forest: 4, plains: 3 },
    apply: () => 'Your wagon is stuck in mud. You lost a day digging it out.',
  },
  {
    id: 'rattlesnake',
    weight: 2,
    whereWeight: { desert: 6, plains: 3 },
    apply: (state, rng) => {
      const alive = aliveMembers(state);
      if (alive.length === 0) return '';
      const target = rng.pick(alive);
      target.health = Math.max(0, target.health - 12);
      return `A rattlesnake struck ${target.name}.`;
    },
  },
  {
    id: 'wolfAttack',
    weight: 2,
    whereWeight: { mountains: 5, forest: 4, plains: 3 },
    apply: (state, rng) => {
      const ammo = Math.min(state.inventory.ammunition, rng.int(20) + 10);
      state.inventory.ammunition -= ammo;
      return `Wolves circled the wagon at night. You fired ${ammo} bullets to drive them off.`;
    },
  },
  {
    id: 'bearEncounter',
    weight: 1,
    whereWeight: { mountains: 4, forest: 4 },
    apply: (state, rng) => {
      const alive = aliveMembers(state);
      if (alive.length === 0) return '';
      const target = rng.pick(alive);
      target.health = Math.max(0, target.health - 15);
      const ammo = Math.min(state.inventory.ammunition, 15);
      state.inventory.ammunition -= ammo;
      return `A bear charged the camp. ${target.name} was hurt; you used ${ammo} bullets.`;
    },
  },
  {
    id: 'buffaloHerd',
    weight: 2,
    whereWeight: { plains: 6 },
    apply: (state, rng) => {
      const meat = rng.int(50) + 30;
      state.inventory.food += meat;
      return `A buffalo herd crossed your path. You took ${meat} pounds of meat.`;
    },
  },
  {
    id: 'memberLost',
    weight: 2,
    whereWeight: { mountains: 4, forest: 4 },
    apply: () => 'A member of your party wandered off. You spent a day searching.',
  },
  {
    id: 'memberFound',
    weight: 1,
    whereWeight: { plains: 3 },
    apply: () => 'You found a stray traveler and shared a meal.',
  },
  {
    id: 'sandstorm',
    weight: 1,
    whereWeight: { desert: 7 },
    apply: (state) => {
      const lost = Math.min(state.inventory.food, 6);
      state.inventory.food -= lost;
      return 'A sandstorm whips through camp. Sand grits everything; food spoiled.';
    },
  },
  {
    id: 'hotSprings',
    weight: 1,
    whereWeight: { mountains: 4 },
    apply: (state) => {
      for (const m of aliveMembers(state)) m.health = Math.min(100, m.health + 3);
      return 'You camped at hot springs. Spirits and bones lift.';
    },
  },
  {
    id: 'avalancheRisk',
    weight: 1,
    whereWeight: { mountains: 5 },
    apply: () => 'A snow slide forced a long detour. You lost time.',
  },
  {
    id: 'fallenTree',
    weight: 2,
    whereWeight: { forest: 6 },
    apply: () => 'A fallen tree blocked the trail. You lost half a day clearing it.',
  },
  {
    id: 'mosquitoes',
    weight: 2,
    whereWeight: { 'river-valley': 6, forest: 4 },
    apply: (state) => {
      for (const m of aliveMembers(state)) m.health = Math.max(0, m.health - 2);
      return 'Mosquitoes plagued the camp all night.';
    },
  },
  {
    id: 'altitude',
    weight: 1,
    whereWeight: { mountains: 4 },
    apply: (state) => {
      for (const m of aliveMembers(state)) m.health = Math.max(0, m.health - 3);
      return 'The thin mountain air left everyone short of breath.';
    },
  },
  {
    id: 'graveyard',
    weight: 1,
    whereWeight: { plains: 3, desert: 2 },
    apply: () => 'You passed a roadside grave. The trail is unkind.',
  },
  {
    id: 'helpfulFort',
    weight: 1,
    whereWeight: { plains: 2, mountains: 2 },
    apply: (state, rng) => {
      const food = rng.int(10) + 5;
      state.inventory.food += food;
      return `Travelers from a nearby fort shared ${food} pounds of food.`;
    },
  },
  {
    id: 'tradingParty',
    weight: 2,
    whereWeight: { plains: 4, 'river-valley': 3 },
    apply: (state, rng) => {
      const ammo = rng.int(20) + 10;
      state.inventory.ammunition += ammo;
      return `A trading party gave you ${ammo} rounds of ammunition.`;
    },
  },
  {
    id: 'sweetWater',
    weight: 1,
    whereWeight: { 'river-valley': 4, mountains: 3 },
    apply: (state) => {
      for (const m of aliveMembers(state)) m.health = Math.min(100, m.health + 2);
      return 'You found a sweetwater spring. Everyone drinks deeply.';
    },
  },
  {
    id: 'lostOx',
    weight: 2,
    whereWeight: { plains: 4, forest: 3 },
    apply: (state) => {
      if (state.inventory.oxen <= 1) return 'An ox wandered off but came back at dawn.';
      state.inventory.oxen -= 1;
      return 'An ox wandered off in the night.';
    },
  },
  {
    id: 'broken-bucket',
    weight: 1,
    apply: (state) => {
      const lost = Math.min(state.inventory.food, 3);
      state.inventory.food -= lost;
      return `A water bucket sprang a leak. ${lost} pounds of food were ruined.`;
    },
  },
];

const TOTAL_WEIGHT = EVENT_DEFS.reduce((s, e) => s + e.weight, 0);

export function effectiveWeight(def: EventDef, env?: Environment): number {
  if (!env || !def.whereWeight) return def.weight;
  const w = def.whereWeight[env];
  return w === undefined ? def.weight : w;
}

export function rollEvent(state: GameState, rng: Rng, env?: Environment): EventOutcome {
  if (!rng.chance(0.35)) return { id: 'none', message: '' };
  const weights = EVENT_DEFS.map((d) => effectiveWeight(d, env));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return { id: 'none', message: '' };
  let r = rng.int(total);
  for (let i = 0; i < EVENT_DEFS.length; i++) {
    const w = weights[i];
    if (r < w) {
      const def = EVENT_DEFS[i];
      const message = def.apply(state, rng);
      return { id: def.id, message };
    }
    r -= w;
  }
  return { id: 'none', message: '' };
}

export function listEvents(): readonly EventDef[] {
  return EVENT_DEFS;
}

export function totalBaseWeight(): number {
  return TOTAL_WEIGHT;
}
