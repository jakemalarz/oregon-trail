import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeScore,
  makeScoreEntry,
  recordScore,
  loadTopTen,
  checkGameOver,
  browserStorage,
} from '../../src/core/scoring';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('scoring', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('oregon-trail-top-ten');
    } catch {
      /* ignore */
    }
  });

  it('computeScore is 0 if not victorious', () => {
    const s = createInitialState(opts());
    expect(computeScore(s)).toBe(0);
  });

  it('computeScore reflects survivors and inventory', () => {
    const s = createInitialState(opts());
    s.victory = true;
    s.inventory = { oxen: 4, food: 100, clothing: 3, ammunition: 50, wheels: 1, axles: 1, tongues: 1 };
    s.money = 100;
    const banker = computeScore(s);
    expect(banker).toBeGreaterThan(0);

    const s2 = { ...s, profession: 'farmer' as const };
    const farmer = computeScore(s2);
    expect(farmer).toBe(banker * 3);
  });

  it('makeScoreEntry contains the leader name and date', () => {
    const s = createInitialState(opts());
    s.victory = true;
    const e = makeScoreEntry(s);
    expect(e.name).toBe('A');
    expect(e.arrived).toBe(true);
    expect(e.profession).toBe('banker');
    expect(e.date).toContain('1848');
  });

  it('recordScore inserts and sorts top ten', () => {
    const list1 = recordScore({ name: 'A', score: 100, profession: 'banker', date: 'x', arrived: true });
    expect(list1).toHaveLength(1);
    const list2 = recordScore({ name: 'B', score: 200, profession: 'farmer', date: 'x', arrived: true });
    expect(list2[0].name).toBe('B');
    for (let i = 0; i < 15; i++) {
      recordScore({ name: `n${i}`, score: i, profession: 'banker', date: 'x', arrived: true });
    }
    const list3 = loadTopTen();
    expect(list3.length).toBeLessThanOrEqual(10);
  });

  it('loadTopTen returns [] when empty', () => {
    expect(loadTopTen()).toEqual([]);
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('oregon-trail-top-ten', '{not json');
    expect(loadTopTen()).toEqual([]);
  });

  it('checkGameOver detects victory and full death', () => {
    const s = createInitialState(opts());
    expect(checkGameOver(s).over).toBe(false);
    s.victory = true;
    expect(checkGameOver(s).over).toBe(true);

    const s2 = createInitialState(opts());
    s2.party.forEach((m) => (m.alive = false));
    expect(checkGameOver(s2).over).toBe(true);
  });

  it('checkGameOver detects no-oxen condition after departure', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 0;
    s.milesTraveled = 50;
    expect(checkGameOver(s).over).toBe(true);
  });

  it('browserStorage falls back when localStorage is unavailable', () => {
    const originalLs = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    const storage = browserStorage();
    expect(storage.load()).toEqual([]);
    storage.save([{ name: 'A', score: 1, profession: 'banker', date: 'x', arrived: true }]);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLs });
  });
});
