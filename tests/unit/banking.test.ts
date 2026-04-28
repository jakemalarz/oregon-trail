import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyForLoan,
  accrueDaily,
  accrueInterest,
  canRepayHere,
  loanBalance,
  loanPenalty,
  LOAN_OPTIONS,
  LOAN_RATE_ANNUAL,
  repayLoan,
} from '../../src/core/banking';
import { createInitialState } from '../../src/core/state';
import { computeScore } from '../../src/core/scoring';
import type { NewGameOptions } from '../../src/core/state';
import type { GameState } from '../../src/core/types';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

function fresh(): GameState {
  return createInitialState(opts());
}

describe('banking', () => {
  beforeEach(() => {
    try { localStorage.removeItem('oregon-trail-top-ten'); } catch { /* ignore */ }
  });

  it('initial state has no loan', () => {
    const s = fresh();
    expect(s.loan).toBeNull();
  });

  it('applyForLoan adds money and records the loan at Independence pre-departure', () => {
    const s = fresh();
    const before = s.money;
    const r = applyForLoan(s, 500);
    expect(r.ok).toBe(true);
    expect(s.money).toBe(before + 500);
    expect(s.loan).not.toBeNull();
    expect(s.loan!.principal).toBe(500);
    expect(s.loan!.outstandingPrincipal).toBe(500);
    expect(s.loan!.outstandingInterest).toBe(0);
    expect(s.loan!.rateAnnual).toBe(LOAN_RATE_ANNUAL);
  });

  it('applyForLoan rejects invalid amounts', () => {
    const s = fresh();
    expect(applyForLoan(s, 123).ok).toBe(false);
    expect(s.loan).toBeNull();
  });

  it('applyForLoan rejects a second loan', () => {
    const s = fresh();
    applyForLoan(s, 100);
    const r = applyForLoan(s, 250);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/already/i);
  });

  it('applyForLoan rejects after departure', () => {
    const s = fresh();
    s.milesTraveled = 50;
    const r = applyForLoan(s, 250);
    expect(r.ok).toBe(false);
  });

  it('applyForLoan rejects away from Independence', () => {
    const s = fresh();
    s.currentNodeId = 'fort-kearney';
    const r = applyForLoan(s, 250);
    expect(r.ok).toBe(false);
  });

  it('LOAN_OPTIONS exports the four standard sizes', () => {
    expect(LOAN_OPTIONS).toEqual([100, 250, 500, 1000]);
  });

  it('accrueInterest grows the outstanding interest daily', () => {
    const s = fresh();
    applyForLoan(s, 1000);
    accrueInterest(s.loan!, 30);
    expect(s.loan!.daysAccrued).toBe(30);
    expect(s.loan!.outstandingInterest).toBeGreaterThan(0);
    expect(s.loan!.outstandingInterest).toBeLessThan(15);
  });

  it('accrueInterest is a no-op for non-positive days', () => {
    const s = fresh();
    applyForLoan(s, 100);
    const before = { ...s.loan! };
    accrueInterest(s.loan!, 0);
    accrueInterest(s.loan!, -5);
    expect(s.loan!.outstandingInterest).toBe(before.outstandingInterest);
    expect(s.loan!.daysAccrued).toBe(before.daysAccrued);
  });

  it('accrueDaily is a no-op when there is no loan', () => {
    const s = fresh();
    expect(() => accrueDaily(s, 5)).not.toThrow();
    expect(s.loan).toBeNull();
  });

  it('repayLoan partially pays interest then principal', () => {
    const s = fresh();
    applyForLoan(s, 500);
    accrueInterest(s.loan!, 10);
    const interestBefore = s.loan!.outstandingInterest;
    const moneyBefore = s.money;
    const r = repayLoan(s, 50);
    expect(r.ok).toBe(true);
    expect(s.money).toBe(moneyBefore - 50);
    expect(s.loan!.outstandingInterest).toBeLessThan(interestBefore);
    expect(s.loan!.outstandingPrincipal).toBeLessThan(500);
  });

  it('repayLoan in full clears the loan', () => {
    const s = fresh();
    applyForLoan(s, 100);
    s.money = 200;
    const balance = loanBalance(s.loan!);
    const r = repayLoan(s, balance);
    expect(r.ok).toBe(true);
    expect(s.loan).toBeNull();
  });

  it('repayLoan rejects when there is no loan or insufficient money', () => {
    const s = fresh();
    expect(repayLoan(s, 100).ok).toBe(false);
    applyForLoan(s, 500);
    s.money = 10;
    expect(repayLoan(s, 100).ok).toBe(false);
    expect(repayLoan(s, 0).ok).toBe(false);
  });

  it('canRepayHere is true at Independence and any fort, false on the trail', () => {
    const s = fresh();
    applyForLoan(s, 100);
    expect(canRepayHere(s)).toBe(true);
    s.currentNodeId = 'fort-kearney';
    expect(canRepayHere(s)).toBe(true);
    s.currentNodeId = 'chimney-rock';
    expect(canRepayHere(s)).toBe(false);
    s.currentNodeId = 'fort-laramie';
    s.currentEdgeId = 'fort-laramie->register-cliff';
    expect(canRepayHere(s)).toBe(false);
  });

  it('canRepayHere returns false when there is no loan', () => {
    const s = fresh();
    expect(canRepayHere(s)).toBe(false);
  });

  it('loanPenalty doubles the outstanding balance', () => {
    const s = fresh();
    applyForLoan(s, 1000);
    accrueInterest(s.loan!, 365);
    const balance = loanBalance(s.loan!);
    expect(loanPenalty(s)).toBe(Math.round(balance * 2));
  });

  it('loanPenalty is 0 with no loan', () => {
    expect(loanPenalty(fresh())).toBe(0);
  });

  it('victory score subtracts the loan penalty', () => {
    const a = fresh();
    a.victory = true;
    a.inventory = { oxen: 4, food: 100, clothing: 3, ammunition: 50, wheels: 1, axles: 1, tongues: 1 };
    a.money = 100;
    const noLoan = computeScore(a);

    const b = fresh();
    b.inventory = { ...a.inventory };
    applyForLoan(b, 500);
    accrueInterest(b.loan!, 60);
    b.victory = true;
    b.money = 100;
    const withLoan = computeScore(b);
    expect(withLoan).toBeLessThan(noLoan);
  });

  it('victory score floors at zero when penalty exceeds score', () => {
    const s = fresh();
    s.victory = true;
    s.money = 0;
    s.inventory = { oxen: 0, food: 0, clothing: 0, ammunition: 0, wheels: 0, axles: 0, tongues: 0 };
    s.party.forEach((m) => (m.alive = false));
    applyForLoan(s, 100);
    expect(computeScore(s)).toBe(0);
  });
});
