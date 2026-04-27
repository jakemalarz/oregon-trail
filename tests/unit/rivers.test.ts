import { describe, it, expect } from 'vitest';
import { crossRiver, FERRY_COST } from '../../src/core/rivers';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { LANDMARKS } from '../../src/core/landmarks';
import { createRng } from '../../src/core/rng';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

const kansas = LANDMARKS.find((l) => l.id === 'kansas-river')!;
const greenRiver = LANDMARKS.find((l) => l.id === 'green-river')!;
const snake = LANDMARKS.find((l) => l.id === 'snake-river')!;

describe('rivers', () => {
  it('FERRY_COST is positive', () => {
    expect(FERRY_COST).toBeGreaterThan(0);
  });

  it('wait advances a day', () => {
    const s = createInitialState(opts());
    const r = crossRiver(s, kansas, 'wait', createRng(1));
    expect(r.daysTaken).toBe(1);
    expect(r.success).toBe(false);
  });

  it('ferry succeeds when available and affordable', () => {
    const s = createInitialState(opts());
    const before = s.money;
    const r = crossRiver(s, greenRiver, 'ferry', createRng(1));
    expect(r.success).toBe(true);
    expect(s.money).toBe(before - FERRY_COST);
  });

  it('ferry fails when not available', () => {
    const s = createInitialState(opts());
    const r = crossRiver(s, kansas, 'ferry', createRng(1));
    expect(r.success).toBe(false);
    expect(r.message).toContain('no ferry');
  });

  it('ferry fails when broke', () => {
    const s = createInitialState(opts());
    s.money = 0;
    const r = crossRiver(s, greenRiver, 'ferry', createRng(1));
    expect(r.success).toBe(false);
  });

  it('ford shallow river succeeds', () => {
    const s = createInitialState(opts());
    const shallow = { ...kansas, riverDepth: 1.0 };
    const r = crossRiver(s, shallow, 'ford', createRng(1));
    expect(r.success).toBe(true);
  });

  it('ford deep river can fail and lose food', () => {
    let failures = 0;
    for (let seed = 1; seed < 100; seed++) {
      const s = createInitialState(opts());
      s.inventory.food = 200;
      const deep = { ...kansas, riverDepth: 5.0 };
      const r = crossRiver(s, deep, 'ford', createRng(seed));
      if (!r.success) failures++;
    }
    expect(failures).toBeGreaterThan(0);
  });

  it('ford a moderately deep river can still succeed sometimes', () => {
    let successes = 0;
    for (let seed = 1; seed < 100; seed++) {
      const s = createInitialState(opts());
      s.inventory.food = 200;
      const r = crossRiver(s, { ...kansas, riverDepth: 3.0 }, 'ford', createRng(seed));
      if (r.success) successes++;
    }
    expect(successes).toBeGreaterThan(0);
  });

  it('caulk can drown a member on very deep rivers', () => {
    let drownings = 0;
    for (let seed = 1; seed < 100; seed++) {
      const s = createInitialState(opts());
      const r = crossRiver(s, { ...snake, riverDepth: 8.0 }, 'caulk', createRng(seed));
      if (r.capsized) drownings++;
    }
    expect(drownings).toBeGreaterThan(0);
  });

  it('caulk shallow river succeeds', () => {
    const s = createInitialState(opts());
    const r = crossRiver(s, { ...kansas, riverDepth: 2.0 }, 'caulk', createRng(1));
    expect(r.success).toBe(true);
  });
});
