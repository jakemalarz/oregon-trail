import { describe, it, expect } from 'vitest';
import { rollEvent, listEvents, effectiveWeight } from '../../src/core/events';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { createRng } from '../../src/core/rng';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('events', () => {
  it('rollEvent often produces "none"', () => {
    const s = createInitialState(opts());
    s.inventory.food = 1000;
    s.inventory.ammunition = 100;
    s.inventory.oxen = 6;
    const rng = createRng(1);
    let nones = 0;
    for (let i = 0; i < 100; i++) {
      const r = rollEvent(s, rng);
      if (r.id === 'none') nones++;
    }
    expect(nones).toBeGreaterThan(40);
  });

  it('events table is non-empty and weights are positive', () => {
    const list = listEvents();
    expect(list.length).toBeGreaterThan(10);
    expect(list.every((e) => e.weight > 0)).toBe(true);
  });

  it('all event handlers can be invoked without errors', () => {
    const list = listEvents();
    for (const def of list) {
      const s = createInitialState(opts());
      s.inventory.food = 100;
      s.inventory.ammunition = 100;
      s.inventory.oxen = 6;
      s.inventory.clothing = 5;
      s.inventory.wheels = 2;
      s.inventory.axles = 2;
      s.inventory.tongues = 2;
      const rng = createRng(def.id.length + 1);
      const msg = def.apply(s, rng);
      expect(typeof msg).toBe('string');
    }
  });

  it('handles broken parts without spares (consumes wagon part)', () => {
    const list = listEvents();
    const wheel = list.find((e) => e.id === 'brokenWheel')!;
    const axle = list.find((e) => e.id === 'brokenAxle')!;
    const tongue = list.find((e) => e.id === 'brokenTongue')!;
    const s = createInitialState(opts());
    const rng = createRng(7);
    s.inventory.wheels = 0;
    s.inventory.axles = 0;
    s.inventory.tongues = 0;
    s.wagon.wheels = 2;
    s.wagon.axles = 1;
    s.wagon.tongues = 1;
    wheel.apply(s, rng);
    expect(s.wagon.wheels).toBeLessThan(2);
    axle.apply(s, rng);
    expect(s.wagon.axles).toBe(0);
    tongue.apply(s, rng);
    expect(s.wagon.tongues).toBe(0);
  });

  it('handles broken parts with spares', () => {
    const list = listEvents();
    const wheel = list.find((e) => e.id === 'brokenWheel')!;
    const s = createInitialState(opts());
    const rng = createRng(7);
    s.inventory.wheels = 1;
    const before = s.inventory.wheels;
    wheel.apply(s, rng);
    expect(s.inventory.wheels).toBe(before - 1);
  });

  it('oxDied with no oxen returns gracefully', () => {
    const list = listEvents();
    const oxDied = list.find((e) => e.id === 'oxDied')!;
    const s = createInitialState(opts());
    const rng = createRng(7);
    s.inventory.oxen = 0;
    const msg = oxDied.apply(s, rng);
    expect(msg).toBe('');
  });

  it('snakebite and illness handle empty alive party', () => {
    const list = listEvents();
    const snake = list.find((e) => e.id === 'snakebite')!;
    const ill = list.find((e) => e.id === 'illness')!;
    const s = createInitialState(opts());
    s.party.forEach((m) => (m.alive = false));
    const rng = createRng(7);
    expect(snake.apply(s, rng)).toBe('');
    expect(ill.apply(s, rng)).toBe('');
  });

  it('rollEvent eventually produces every event id over many seeds', () => {
    const list = listEvents();
    const seen = new Set<string>();
    for (let seed = 1; seed < 20000 && seen.size < list.length; seed++) {
      const s = createInitialState(opts());
      s.inventory.food = 1000;
      s.inventory.ammunition = 200;
      s.inventory.oxen = 6;
      s.inventory.clothing = 5;
      s.inventory.wheels = 1;
      s.inventory.axles = 1;
      s.inventory.tongues = 1;
      const rng = createRng(seed);
      for (let i = 0; i < 20; i++) {
        const r = rollEvent(s, rng);
        if (r.id !== 'none') seen.add(r.id);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(list.length - 4);
  });

  it('catalog has at least 40 events with positive base weights', () => {
    const list = listEvents();
    expect(list.length).toBeGreaterThanOrEqual(40);
    expect(list.every((e) => e.weight > 0)).toBe(true);
  });

  it('effectiveWeight defaults to base weight when env or whereWeight missing', () => {
    const list = listEvents();
    const def = list.find((e) => e.id === 'theft')!;
    expect(effectiveWeight(def)).toBe(def.weight);
    expect(effectiveWeight(def, 'plains')).toBe(def.weight);
    const fruit = list.find((e) => e.id === 'fruitFound')!;
    expect(effectiveWeight(fruit, 'desert')).toBe(0);
    expect(effectiveWeight(fruit, 'forest')).toBeGreaterThan(fruit.weight);
  });

  it('environment weighting biases the distribution', () => {
    const list = listEvents();
    const buffalo = list.find((e) => e.id === 'buffaloHerd')!;
    const sandstorm = list.find((e) => e.id === 'sandstorm')!;
    expect(effectiveWeight(buffalo, 'plains')).toBeGreaterThan(effectiveWeight(buffalo, 'forest'));
    expect(effectiveWeight(sandstorm, 'desert')).toBeGreaterThan(effectiveWeight(sandstorm, 'plains'));
  });

  it('rollEvent on plains yields buffalo more than on mountains (statistical)', () => {
    const rngPlains = createRng(99);
    const rngMtn = createRng(99);
    let plainsHits = 0;
    let mtnHits = 0;
    const trials = 800;
    for (let i = 0; i < trials; i++) {
      const sP = createInitialState(opts());
      sP.inventory.food = 0;
      const r1 = rollEvent(sP, rngPlains, 'plains');
      if (r1.id === 'buffaloHerd') plainsHits++;
      const sM = createInitialState(opts());
      sM.inventory.food = 0;
      const r2 = rollEvent(sM, rngMtn, 'mountains');
      if (r2.id === 'buffaloHerd') mtnHits++;
    }
    expect(plainsHits).toBeGreaterThan(mtnHits);
  });
});
