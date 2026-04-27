import { describe, it, expect } from 'vitest';
import {
  inflictIllness,
  applyIllnessTick,
  attemptRecovery,
  pickRandomIllness,
  ILLNESSES,
} from '../../src/core/illness';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { createRng } from '../../src/core/rng';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('illness', () => {
  it('inflictIllness sets the illness when none', () => {
    const s = createInitialState(opts());
    inflictIllness(s.party[0], 'cholera');
    expect(s.party[0].illness).toBe('cholera');
  });

  it('inflictIllness does not overwrite existing illness', () => {
    const s = createInitialState(opts());
    s.party[0].illness = 'fever';
    inflictIllness(s.party[0], 'cholera');
    expect(s.party[0].illness).toBe('fever');
  });

  it('applyIllnessTick reduces health and can kill', () => {
    const s = createInitialState(opts());
    s.party[0].illness = 'cholera';
    s.party[0].health = 5;
    const msgs = applyIllnessTick(s);
    expect(s.party[0].alive).toBe(false);
    expect(msgs[0]).toContain('died');
  });

  it('applyIllnessTick skips healthy members', () => {
    const s = createInitialState(opts());
    const msgs = applyIllnessTick(s);
    expect(msgs).toHaveLength(0);
    expect(s.party.every((m) => m.alive)).toBe(true);
  });

  it('attemptRecovery may clear illness when healthy', () => {
    const s = createInitialState(opts());
    s.party[0].illness = 'fever';
    s.party[0].health = 80;
    const rng = createRng(123);
    let recovered = false;
    for (let i = 0; i < 50 && !recovered; i++) {
      attemptRecovery(s, rng);
      if ((s.party[0].illness as string) === 'none') recovered = true;
    }
    expect(recovered).toBe(true);
  });

  it('attemptRecovery does nothing when health low', () => {
    const s = createInitialState(opts());
    s.party[0].illness = 'fever';
    s.party[0].health = 30;
    const rng = createRng(1);
    attemptRecovery(s, rng);
    expect(s.party[0].illness).toBe('fever');
  });

  it('pickRandomIllness returns a known illness', () => {
    const rng = createRng(5);
    const ill = pickRandomIllness(rng);
    expect(ILLNESSES).toContain(ill);
  });

  it('all daily damage cases are covered', () => {
    const s = createInitialState(opts());
    const ill: Array<typeof s.party[0]['illness']> = [
      'typhoid',
      'cholera',
      'measles',
      'dysentery',
      'fever',
      'exhaustion',
      'broken arm',
      'broken leg',
      'snake bite',
    ];
    ill.forEach((i, idx) => {
      s.party[idx % s.party.length].illness = i;
      s.party[idx % s.party.length].health = 100;
    });
    applyIllnessTick(s);
    // None should have died from one tick at full health
    expect(s.party.every((m) => m.alive)).toBe(true);
  });
});
