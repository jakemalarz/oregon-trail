import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('rng', () => {
  it('produces deterministic output for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different output for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    let differs = false;
    for (let i = 0; i < 10; i++) {
      if (a.next() !== b.next()) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('next() returns values in [0, 1)', () => {
    const r = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns integers in [0, n)', () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      seen.add(v);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('range(min, max) returns values in [min, max)', () => {
    const r = createRng(99);
    for (let i = 0; i < 100; i++) {
      const v = r.range(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it('chance(p) is roughly proportional', () => {
    const r = createRng(2024);
    let trues = 0;
    for (let i = 0; i < 1000; i++) if (r.chance(0.5)) trues++;
    expect(trues).toBeGreaterThan(400);
    expect(trues).toBeLessThan(600);
  });

  it('pick() returns elements from the array', () => {
    const r = createRng(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('pick() throws on empty', () => {
    const r = createRng(3);
    expect(() => r.pick([])).toThrow();
  });

  it('handles seed 0 by using fallback', () => {
    const r = createRng(0);
    const v = r.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('state() advances after next()', () => {
    const r = createRng(10);
    const before = r.state();
    r.next();
    const after = r.state();
    expect(before).not.toBe(after);
  });
});
