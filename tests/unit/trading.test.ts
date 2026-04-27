import { describe, it, expect } from 'vitest';
import { generateOffer, applyTrade } from '../../src/core/trading';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { createRng } from '../../src/core/rng';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('trading', () => {
  it('generateOffer produces sane offers', () => {
    for (let seed = 1; seed < 30; seed++) {
      const offer = generateOffer(createRng(seed));
      expect(offer.give.quantity).toBeGreaterThan(0);
      expect(offer.receive.quantity).toBeGreaterThan(0);
      expect(offer.give.item).not.toBe(offer.receive.item);
    }
  });

  it('applyTrade succeeds when player has enough', () => {
    const s = createInitialState(opts());
    s.inventory.food = 100;
    const r = applyTrade(s, {
      give: { item: 'food', quantity: 30 },
      receive: { item: 'clothing', quantity: 2 },
    });
    expect(r.ok).toBe(true);
    expect(s.inventory.food).toBe(70);
    expect(s.inventory.clothing).toBe(2);
  });

  it('applyTrade fails when player short', () => {
    const s = createInitialState(opts());
    s.inventory.food = 5;
    const r = applyTrade(s, {
      give: { item: 'food', quantity: 30 },
      receive: { item: 'clothing', quantity: 2 },
    });
    expect(r.ok).toBe(false);
    expect(s.inventory.food).toBe(5);
  });

  it('multiple seeds cover all trade pairs', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 200; seed++) {
      const o = generateOffer(createRng(seed));
      seen.add(`${o.give.item}->${o.receive.item}`);
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});
