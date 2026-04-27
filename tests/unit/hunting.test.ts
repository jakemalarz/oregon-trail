import { describe, it, expect } from 'vitest';
import {
  applyHunt,
  pickAnimal,
  canHunt,
  ANIMAL_MEAT,
  HUNT_CARRY_CAP,
  SHOT_AMMO_COST,
} from '../../src/core/hunting';
import type { Animal } from '../../src/core/hunting';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { createRng } from '../../src/core/rng';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('hunting', () => {
  it('exports', () => {
    expect(HUNT_CARRY_CAP).toBe(100);
    expect(SHOT_AMMO_COST).toBe(1);
  });

  it('pickAnimal returns one of the animals', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const a = pickAnimal(rng);
      expect(['rabbit', 'deer', 'buffalo', 'bear']).toContain(a);
    }
  });

  it('applyHunt deducts ammo and caps meat', () => {
    const s = createInitialState(opts());
    s.inventory.ammunition = 50;
    s.inventory.food = 0;
    const r = applyHunt(s, ['buffalo'], 5);
    expect(r.ammoUsed).toBe(5);
    expect(s.inventory.ammunition).toBe(45);
    expect(r.meatGained).toBe(HUNT_CARRY_CAP);
    expect(s.inventory.food).toBe(HUNT_CARRY_CAP);
  });

  it('applyHunt with no kills uses ammo only', () => {
    const s = createInitialState(opts());
    s.inventory.ammunition = 10;
    const r = applyHunt(s, [], 3);
    expect(r.animalsKilled).toBe(0);
    expect(r.meatGained).toBe(0);
    expect(s.inventory.ammunition).toBe(7);
  });

  it('applyHunt clamps ammo to inventory', () => {
    const s = createInitialState(opts());
    s.inventory.ammunition = 2;
    const r = applyHunt(s, ['rabbit'], 10);
    expect(r.ammoUsed).toBe(2);
    expect(s.inventory.ammunition).toBe(0);
  });

  it('applyHunt sums small meats', () => {
    const s = createInitialState(opts());
    s.inventory.ammunition = 10;
    const animals: Animal[] = ['rabbit', 'rabbit', 'deer'];
    const r = applyHunt(s, animals, 3);
    expect(r.meatGained).toBe(ANIMAL_MEAT.rabbit * 2 + ANIMAL_MEAT.deer);
  });

  it('canHunt requires ammo', () => {
    const s = createInitialState(opts());
    s.inventory.ammunition = 0;
    expect(canHunt(s).ok).toBe(false);
    s.inventory.ammunition = 5;
    expect(canHunt(s).ok).toBe(true);
  });
});
