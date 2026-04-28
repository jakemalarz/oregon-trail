import { describe, it, expect, beforeEach } from 'vitest';
import {
  EPITAPH_MAX_LEN,
  loadTombstones,
  makeTombstone,
  maybeEncounterTombstone,
  saveTombstone,
  sanitizeEpitaph,
  TOMBSTONE_CAP,
  tombstonesAtNode,
  type TombstoneStorage,
} from '../../src/core/tombstone';
import { createInitialState, type NewGameOptions } from '../../src/core/state';
import { createRng } from '../../src/core/rng';

class MemStorage implements TombstoneStorage {
  data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['Ezra', 'Mary', 'John', 'Sarah', 'Jed'],
  departureMonth: 'April',
  seed: 1,
});

describe('tombstone', () => {
  let mem: MemStorage;
  beforeEach(() => { mem = new MemStorage(); });

  it('sanitizeEpitaph strips control chars and clamps length', () => {
    const long = 'x'.repeat(EPITAPH_MAX_LEN + 20);
    expect(sanitizeEpitaph(long)).toHaveLength(EPITAPH_MAX_LEN);
    expect(sanitizeEpitaph('  hello\nworld\t  ')).toBe('hello world');
    expect(sanitizeEpitaph('   ')).toBe('');
  });

  it('round-trips through storage', () => {
    const rec = {
      name: 'Ezra',
      epitaph: 'Gone west.',
      nodeId: 'fort-kearney',
      date: { month: 'May' as const, day: 12, year: 1848 },
      seed: 42,
    };
    saveTombstone(rec, mem);
    const loaded = loadTombstones(mem);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(rec);
  });

  it('caps storage at TOMBSTONE_CAP', () => {
    for (let i = 0; i < TOMBSTONE_CAP + 10; i++) {
      saveTombstone({
        name: `n${i}`, epitaph: 'x', nodeId: 'a',
        date: { month: 'April', day: 1, year: 1848 }, seed: i,
      }, mem);
    }
    expect(loadTombstones(mem).length).toBe(TOMBSTONE_CAP);
  });

  it('tolerates corrupt storage', () => {
    mem.setItem('oregon-trail-tombstones-v1', 'not-json');
    expect(loadTombstones(mem)).toEqual([]);
  });

  it('filters tombstones at a given node', () => {
    saveTombstone({ name: 'A', epitaph: 'a', nodeId: 'x', date: { month: 'April', day: 1, year: 1848 }, seed: 1 }, mem);
    saveTombstone({ name: 'B', epitaph: 'b', nodeId: 'y', date: { month: 'April', day: 1, year: 1848 }, seed: 2 }, mem);
    saveTombstone({ name: 'C', epitaph: 'c', nodeId: 'x', date: { month: 'April', day: 1, year: 1848 }, seed: 3 }, mem);
    expect(tombstonesAtNode('x', mem)).toHaveLength(2);
    expect(tombstonesAtNode('y', mem)).toHaveLength(1);
    expect(tombstonesAtNode('z', mem)).toHaveLength(0);
  });

  it('makeTombstone uses leader name and epitaph', () => {
    const s = createInitialState(opts());
    s.epitaph = 'Brave to the end.';
    s.currentNodeId = 'chimney-rock';
    const t = makeTombstone(s);
    expect(t.name).toBe('Ezra');
    expect(t.epitaph).toBe('Brave to the end.');
    expect(t.nodeId).toBe('chimney-rock');
  });

  it('maybeEncounterTombstone returns null without records', () => {
    const s = createInitialState(opts());
    const rng = createRng(1);
    expect(maybeEncounterTombstone(s, rng, mem)).toBeNull();
  });

  it('maybeEncounterTombstone honors the daily chance', () => {
    saveTombstone({ name: 'Z', epitaph: 'z', nodeId: 'independence', date: { month: 'April', day: 1, year: 1848 }, seed: 0 }, mem);
    const s = createInitialState(opts());
    let hits = 0;
    for (let i = 0; i < 2000; i++) {
      const rng = createRng(i);
      if (maybeEncounterTombstone(s, rng, mem)) hits += 1;
    }
    expect(hits).toBeGreaterThan(50);
    expect(hits).toBeLessThan(200);
  });

  it('rejects malformed records on load', () => {
    mem.setItem('oregon-trail-tombstones-v1', JSON.stringify([
      { name: 'OK', epitaph: 'x', nodeId: 'n', date: { month: 'April', day: 1, year: 1848 }, seed: 1 },
      { broken: true },
    ]));
    expect(loadTombstones(mem)).toHaveLength(1);
  });

  it('returns empty arrays when storage is null', () => {
    expect(loadTombstones(null)).toEqual([]);
    expect(tombstonesAtNode('x', null)).toEqual([]);
  });

  it('saveTombstone is a no-op when storage is null', () => {
    expect(() => saveTombstone({ name: 'A', epitaph: 'x', nodeId: 'n', date: { month: 'April', day: 1, year: 1848 }, seed: 0 }, null)).not.toThrow();
  });

  it('rejects non-array JSON payloads', () => {
    mem.setItem('oregon-trail-tombstones-v1', JSON.stringify({ not: 'an array' }));
    expect(loadTombstones(mem)).toEqual([]);
  });

  it('returns empty when storage key is unset', () => {
    expect(loadTombstones(mem)).toEqual([]);
  });

  it('makeTombstone honors nameOverride and falls back to "Rest in peace."', () => {
    const s = createInitialState(opts());
    s.epitaph = null;
    const t = makeTombstone(s, 'Custom Name');
    expect(t.name).toBe('Custom Name');
    expect(t.epitaph).toBe('Rest in peace.');
  });

  it('maybeEncounterTombstone returns null when no tombstones at the current node', () => {
    saveTombstone({ name: 'X', epitaph: 'x', nodeId: 'fort-laramie', date: { month: 'April', day: 1, year: 1848 }, seed: 0 }, mem);
    const s = createInitialState(opts());
    s.currentNodeId = 'chimney-rock';
    let nullCount = 0;
    for (let i = 0; i < 50; i++) {
      const rng = createRng(i + 1000);
      if (maybeEncounterTombstone(s, rng, mem) === null) nullCount++;
    }
    expect(nullCount).toBe(50);
  });

  it('uses default storage when none supplied (jsdom localStorage)', () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('oregon-trail-tombstones-v1');
    expect(loadTombstones()).toEqual([]);
    saveTombstone({ name: 'D', epitaph: 'd', nodeId: 'n', date: { month: 'April', day: 1, year: 1848 }, seed: 0 });
    expect(loadTombstones().length).toBeGreaterThan(0);
    localStorage.removeItem('oregon-trail-tombstones-v1');
  });
});
