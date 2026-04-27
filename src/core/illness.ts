import type { GameState, Illness, PartyMember } from './types';
import type { Rng } from './rng';
import { aliveMembers } from './state';
import { clamp } from './travel';

export const ILLNESSES: readonly Illness[] = [
  'typhoid',
  'cholera',
  'measles',
  'dysentery',
  'fever',
  'exhaustion',
] as const;

const ILLNESS_DAILY_DAMAGE: Record<Illness, number> = {
  typhoid: 8,
  cholera: 10,
  measles: 6,
  dysentery: 7,
  fever: 5,
  exhaustion: 4,
  'broken arm': 1,
  'broken leg': 2,
  'snake bite': 6,
  none: 0,
};

export function inflictIllness(member: PartyMember, illness: Illness): void {
  if (member.illness === 'none') member.illness = illness;
}

export function applyIllnessTick(state: GameState): string[] {
  const messages: string[] = [];
  for (const m of aliveMembers(state)) {
    if (m.illness === 'none') continue;
    m.health = clamp(m.health - ILLNESS_DAILY_DAMAGE[m.illness], 0, 100);
    if (m.health <= 0) {
      m.alive = false;
      m.health = 0;
      messages.push(`${m.name} has died of ${m.illness}.`);
    }
  }
  return messages;
}

export function attemptRecovery(state: GameState, rng: Rng): void {
  for (const m of aliveMembers(state)) {
    if (m.illness === 'none') continue;
    if (m.health > 60 && rng.chance(0.25)) {
      m.illness = 'none';
    }
  }
}

export function pickRandomIllness(rng: Rng): Illness {
  return rng.pick(ILLNESSES);
}
