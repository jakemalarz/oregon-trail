import { describe, it, expect } from 'vitest';
import {
  ALL_ANIMAL_IDS,
  ANIMALS,
  animalsForEnvironment,
  pickAnimalForEnvironment,
} from '../../src/core/animals';
import { createRng } from '../../src/core/rng';

describe('animals', () => {
  it('has 12 distinct animal definitions', () => {
    expect(ALL_ANIMAL_IDS).toHaveLength(12);
    expect(new Set(ALL_ANIMAL_IDS).size).toBe(12);
  });

  it('every def has positive weight, hp, size, and at least one environment', () => {
    for (const a of Object.values(ANIMALS)) {
      expect(a.spawnWeight).toBeGreaterThan(0);
      expect(a.hpToKill).toBeGreaterThanOrEqual(1);
      expect(a.sizePx).toBeGreaterThan(0);
      expect(a.meatLbs).toBeGreaterThanOrEqual(0);
      expect(a.environments.length).toBeGreaterThan(0);
    }
  });

  it('animalsForEnvironment includes the right set per biome', () => {
    expect(animalsForEnvironment('plains').map((a) => a.id)).toEqual(
      expect.arrayContaining(['rabbit', 'antelope', 'deer', 'buffalo', 'wolf', 'fox']),
    );
    expect(animalsForEnvironment('river-valley').map((a) => a.id)).toEqual(
      expect.arrayContaining(['goose', 'duck', 'moose']),
    );
    expect(animalsForEnvironment('desert')).toEqual([]);
  });

  it('hostile flag is set for bear and wolf', () => {
    expect(ANIMALS.bear.hostile).toBe(true);
    expect(ANIMALS.wolf.hostile).toBe(true);
    expect(ANIMALS.deer.hostile).toBeFalsy();
  });

  it('pickAnimalForEnvironment returns a member of the biome', () => {
    const rng = createRng(11);
    for (let i = 0; i < 50; i++) {
      const a = pickAnimalForEnvironment(rng, 'forest');
      expect(a.environments).toContain('forest');
    }
  });

  it('pickAnimalForEnvironment falls back to plains when biome is empty', () => {
    const rng = createRng(11);
    const a = pickAnimalForEnvironment(rng, 'desert');
    expect(a.environments).toContain('plains');
  });

  it('wolf has zero meat (hostile, not food)', () => {
    expect(ANIMALS.wolf.meatLbs).toBe(0);
  });
});
