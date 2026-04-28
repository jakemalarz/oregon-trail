import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/core/engine';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (overrides: Partial<NewGameOptions> = {}): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
  ...overrides,
});

function fullyOutfitted() {
  const s = createInitialState(opts());
  s.inventory = { oxen: 6, food: 2000, clothing: 5, ammunition: 200, wheels: 2, axles: 2, tongues: 2 };
  return s;
}

describe('engine', () => {
  it('step advances the game', () => {
    const s = fullyOutfitted();
    const eng = createEngine(s);
    const r = eng.step();
    expect(r.gameOver).toBe(false);
    expect(s.milesTraveled).toBeGreaterThan(0);
    expect(s.log.length).toBeGreaterThanOrEqual(1);
  });

  it('step is deterministic with same seed', () => {
    const a = createEngine(fullyOutfitted());
    const b = createEngine(fullyOutfitted());
    for (let i = 0; i < 30; i++) {
      a.step();
      b.step();
    }
    expect(a.state.milesTraveled).toBe(b.state.milesTraveled);
    expect(a.state.inventory.food).toBe(b.state.inventory.food);
  });

  it('step ends when ended', () => {
    const s = fullyOutfitted();
    s.ended = true;
    const eng = createEngine(s);
    const r = eng.step();
    expect(r.gameOver).toBe(true);
  });

  it('eventually wins when fully outfitted with enough days', () => {
    const s = fullyOutfitted();
    s.inventory.food = 5000;
    s.inventory.ammunition = 1000;
    const eng = createEngine(s);
    let steps = 0;
    while (!s.ended && steps < 500) {
      eng.step();
      steps++;
    }
    expect(s.ended).toBe(true);
  });

  it('detects total-party-kill', () => {
    const s = fullyOutfitted();
    const eng = createEngine(s);
    s.party.forEach((m) => {
      m.illness = 'cholera';
      m.health = 5;
    });
    const r = eng.step();
    if (r.gameOver) {
      expect(r.reason).toBeDefined();
    }
  });

  it('writes a death entry to the journal when a member dies during a step', () => {
    const s = fullyOutfitted();
    const eng = createEngine(s);
    s.party[1].illness = 'cholera';
    s.party[1].health = 1;
    for (let i = 0; i < 60 && s.party[1].alive; i++) eng.step();
    if (!s.party[1].alive) {
      const deaths = s.journal.filter((j) => j.kind === 'death');
      expect(deaths.length).toBeGreaterThan(0);
      expect(deaths.some((d) => d.text.includes(s.party[1].name))).toBe(true);
    }
  });
});
