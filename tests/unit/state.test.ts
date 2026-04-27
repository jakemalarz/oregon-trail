import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  PROFESSION_STARTING_MONEY,
  PROFESSION_MULTIPLIER,
  aliveCount,
  aliveMembers,
  makePartyMember,
} from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const baseOpts = (overrides: Partial<NewGameOptions> = {}): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['Alice', 'Bob', 'Carol', 'Dan', 'Eve'],
  departureMonth: 'April',
  seed: 1,
  ...overrides,
});

describe('state', () => {
  it('starts with correct money per profession', () => {
    expect(PROFESSION_STARTING_MONEY.banker).toBe(1600);
    expect(PROFESSION_STARTING_MONEY.carpenter).toBe(800);
    expect(PROFESSION_STARTING_MONEY.farmer).toBe(400);
  });

  it('profession multipliers', () => {
    expect(PROFESSION_MULTIPLIER.banker).toBe(1);
    expect(PROFESSION_MULTIPLIER.carpenter).toBe(2);
    expect(PROFESSION_MULTIPLIER.farmer).toBe(3);
  });

  it('createInitialState builds a banker correctly', () => {
    const s = createInitialState(baseOpts());
    expect(s.money).toBe(1600);
    expect(s.party).toHaveLength(5);
    expect(s.party.every((m) => m.alive)).toBe(true);
    expect(s.party.every((m) => m.health === 100)).toBe(true);
    expect(s.party.every((m) => m.illness === 'none')).toBe(true);
    expect(s.pace).toBe('steady');
    expect(s.rations).toBe('filling');
    expect(s.milesTraveled).toBe(0);
    expect(s.landmarkIndex).toBe(0);
    expect(s.date.year).toBe(1848);
    expect(s.ended).toBe(false);
    expect(s.victory).toBe(false);
    expect(s.log.length).toBeGreaterThan(0);
  });

  it('createInitialState supports farmer + departure month', () => {
    const s = createInitialState(baseOpts({ profession: 'farmer', departureMonth: 'July' }));
    expect(s.money).toBe(400);
    expect(s.date.month).toBe('July');
  });

  it('aliveCount and aliveMembers reflect deaths', () => {
    const s = createInitialState(baseOpts());
    expect(aliveCount(s)).toBe(5);
    s.party[0].alive = false;
    s.party[1].alive = false;
    expect(aliveCount(s)).toBe(3);
    expect(aliveMembers(s)).toHaveLength(3);
  });

  it('makePartyMember creates default member', () => {
    const m = makePartyMember('Frank');
    expect(m.name).toBe('Frank');
    expect(m.alive).toBe(true);
    expect(m.health).toBe(100);
    expect(m.illness).toBe('none');
  });
});
