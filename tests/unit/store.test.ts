import { describe, it, expect } from 'vitest';
import {
  INDEPENDENCE_PRICES,
  purchase,
  priceFor,
  priceListFor,
  isReadyToDepart,
  AMMO_BOX_SIZE,
} from '../../src/core/store';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('store', () => {
  it('exports AMMO_BOX_SIZE', () => {
    expect(AMMO_BOX_SIZE).toBe(20);
  });

  it('priceFor calculates linear costs', () => {
    expect(priceFor('food', INDEPENDENCE_PRICES, 100)).toBe(20);
    expect(priceFor('clothing', INDEPENDENCE_PRICES, 3)).toBe(30);
    expect(priceFor('ammunition', INDEPENDENCE_PRICES, 50)).toBe(100);
    expect(priceFor('wheels', INDEPENDENCE_PRICES, 2)).toBe(20);
  });

  it('purchase oxen costs $40 per ox (2 per yoke)', () => {
    const s = createInitialState(opts());
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'oxen', quantity: 2 });
    expect(r.ok).toBe(true);
    expect(s.inventory.oxen).toBe(4);
    expect(s.money).toBe(1600 - 4 * 40);
  });

  it('purchase rejects too many oxen', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 10;
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'oxen', quantity: 2 });
    expect(r.ok).toBe(false);
  });

  it('purchase rejects zero yokes', () => {
    const s = createInitialState(opts());
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'oxen', quantity: 0 });
    expect(r.ok).toBe(false);
  });

  it('purchase deducts money for food', () => {
    const s = createInitialState(opts());
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'food', quantity: 200 });
    expect(r.ok).toBe(true);
    expect(s.inventory.food).toBe(200);
    expect(s.money).toBe(1600 - 40);
  });

  it('purchase rejects when insufficient money', () => {
    const s = createInitialState(opts());
    s.money = 5;
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'oxen', quantity: 2 });
    expect(r.ok).toBe(false);
  });

  it('purchase rejects negative quantity', () => {
    const s = createInitialState(opts());
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'food', quantity: -1 });
    expect(r.ok).toBe(false);
  });

  it('purchase rejects non-finite quantity', () => {
    const s = createInitialState(opts());
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'food', quantity: Infinity });
    expect(r.ok).toBe(false);
  });

  it('caps wheels at 3 spares', () => {
    const s = createInitialState(opts());
    s.inventory.wheels = 3;
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'wheels', quantity: 1 });
    expect(r.ok).toBe(false);
  });

  it('caps axles at 3 spares', () => {
    const s = createInitialState(opts());
    s.inventory.axles = 3;
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'axles', quantity: 1 });
    expect(r.ok).toBe(false);
  });

  it('caps tongues at 3 spares', () => {
    const s = createInitialState(opts());
    s.inventory.tongues = 3;
    const r = purchase(s, INDEPENDENCE_PRICES, { item: 'tongues', quantity: 1 });
    expect(r.ok).toBe(false);
  });

  it('purchase clothing and ammunition', () => {
    const s = createInitialState(opts());
    expect(purchase(s, INDEPENDENCE_PRICES, { item: 'clothing', quantity: 5 }).ok).toBe(true);
    expect(s.inventory.clothing).toBe(5);
    expect(purchase(s, INDEPENDENCE_PRICES, { item: 'ammunition', quantity: 100 }).ok).toBe(true);
    expect(s.inventory.ammunition).toBe(100);
  });

  it('priceListFor returns Independence prices for non-fort', () => {
    expect(priceListFor('chimney-rock')).toEqual(INDEPENDENCE_PRICES);
  });

  it('priceListFor scales fort prices', () => {
    const fort = priceListFor('fort-laramie');
    expect(fort.oxen).toBe(80);
    expect(fort.food).toBeCloseTo(0.4);
  });

  it('isReadyToDepart enforces minimums', () => {
    const s = createInitialState(opts());
    expect(isReadyToDepart(s).ready).toBe(false);
    s.inventory.oxen = 4;
    expect(isReadyToDepart(s).ready).toBe(false);
    s.inventory.food = 200;
    expect(isReadyToDepart(s).ready).toBe(false);
    s.inventory.clothing = 5;
    expect(isReadyToDepart(s).ready).toBe(true);
  });
});
