import type { Environment } from './types';
import type { Rng } from './rng';

export type AnimalId =
  | 'rabbit'
  | 'squirrel'
  | 'goose'
  | 'duck'
  | 'fox'
  | 'antelope'
  | 'deer'
  | 'elk'
  | 'bear'
  | 'buffalo'
  | 'wolf'
  | 'moose';

export interface AnimalDef {
  id: AnimalId;
  meatLbs: number;
  spawnWeight: number;
  hpToKill: number;
  sizePx: number;
  speed: number;
  environments: Environment[];
  color: string;
  hostile?: boolean;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  rabbit:    { id: 'rabbit',    meatLbs: 2,   spawnWeight: 8, hpToKill: 1, sizePx: 6,  speed: 1.4, environments: ['plains', 'forest'],          color: '#ddd' },
  squirrel:  { id: 'squirrel',  meatLbs: 1,   spawnWeight: 9, hpToKill: 1, sizePx: 5,  speed: 1.6, environments: ['forest'],                    color: '#a85' },
  goose:     { id: 'goose',     meatLbs: 4,   spawnWeight: 5, hpToKill: 1, sizePx: 8,  speed: 1.2, environments: ['river-valley'],              color: '#eee' },
  duck:      { id: 'duck',      meatLbs: 3,   spawnWeight: 5, hpToKill: 1, sizePx: 7,  speed: 1.2, environments: ['river-valley'],              color: '#284' },
  fox:       { id: 'fox',       meatLbs: 6,   spawnWeight: 3, hpToKill: 1, sizePx: 8,  speed: 1.5, environments: ['forest', 'plains'],          color: '#c63' },
  antelope:  { id: 'antelope',  meatLbs: 60,  spawnWeight: 4, hpToKill: 1, sizePx: 12, speed: 1.7, environments: ['plains'],                    color: '#db8' },
  deer:      { id: 'deer',      meatLbs: 50,  spawnWeight: 5, hpToKill: 1, sizePx: 12, speed: 1.3, environments: ['forest', 'plains'],          color: '#fa5' },
  elk:       { id: 'elk',       meatLbs: 200, spawnWeight: 3, hpToKill: 2, sizePx: 14, speed: 1.1, environments: ['mountains', 'forest'],       color: '#a73' },
  bear:      { id: 'bear',      meatLbs: 100, spawnWeight: 1, hpToKill: 3, sizePx: 16, speed: 0.9, environments: ['forest', 'mountains'],       color: '#640', hostile: true },
  buffalo:   { id: 'buffalo',   meatLbs: 350, spawnWeight: 2, hpToKill: 2, sizePx: 16, speed: 0.7, environments: ['plains'],                    color: '#a64' },
  wolf:      { id: 'wolf',      meatLbs: 0,   spawnWeight: 1, hpToKill: 1, sizePx: 10, speed: 1.6, environments: ['plains', 'mountains'],       color: '#888', hostile: true },
  moose:     { id: 'moose',     meatLbs: 250, spawnWeight: 1, hpToKill: 2, sizePx: 16, speed: 0.8, environments: ['mountains', 'river-valley'], color: '#430' },
};

export const ALL_ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];

export function animalsForEnvironment(env: Environment): AnimalDef[] {
  return ALL_ANIMAL_IDS.map((id) => ANIMALS[id]).filter((a) => a.environments.includes(env));
}

export function pickAnimalForEnvironment(rng: Rng, env: Environment): AnimalDef {
  const candidates = animalsForEnvironment(env);
  const pool = candidates.length > 0 ? candidates : animalsForEnvironment('plains');
  const total = pool.reduce((s, a) => s + a.spawnWeight, 0);
  let r = rng.int(total);
  for (const a of pool) {
    if (r < a.spawnWeight) return a;
    r -= a.spawnWeight;
  }
  return pool[0];
}
