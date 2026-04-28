import type { GameState, Loan } from './types';

export const LOAN_OPTIONS = [100, 250, 500, 1000] as const;
export type LoanAmount = (typeof LOAN_OPTIONS)[number];

export const LOAN_RATE_ANNUAL = 0.10;
const DAILY_RATE = LOAN_RATE_ANNUAL / 365;

export const LOAN_PENALTY_MULTIPLIER = 2;

export interface ApplyLoanResult {
  ok: boolean;
  reason?: string;
}

export function applyForLoan(state: GameState, amount: number): ApplyLoanResult {
  if (state.loan) return { ok: false, reason: 'You already have an outstanding loan.' };
  if (state.currentNodeId !== 'independence') {
    return { ok: false, reason: 'Loans are only available in Independence.' };
  }
  if (state.milesTraveled > 0) {
    return { ok: false, reason: 'You cannot take a loan once you have left.' };
  }
  if (!LOAN_OPTIONS.includes(amount as LoanAmount)) {
    return { ok: false, reason: 'Invalid loan amount.' };
  }
  state.loan = {
    principal: amount,
    rateAnnual: LOAN_RATE_ANNUAL,
    takenOn: { ...state.date },
    daysAccrued: 0,
    outstandingPrincipal: amount,
    outstandingInterest: 0,
  };
  state.money += amount;
  state.log.push(`Took out a $${amount} loan at ${(LOAN_RATE_ANNUAL * 100).toFixed(0)}% interest.`);
  return { ok: true };
}

export function accrueInterest(loan: Loan, days: number): void {
  if (days <= 0) return;
  for (let i = 0; i < days; i++) {
    const interestToday = (loan.outstandingPrincipal + loan.outstandingInterest) * DAILY_RATE;
    loan.outstandingInterest += interestToday;
    loan.daysAccrued += 1;
  }
}

export function accrueDaily(state: GameState, days = 1): void {
  if (!state.loan) return;
  accrueInterest(state.loan, days);
}

export interface RepayResult {
  ok: boolean;
  reason?: string;
  amountPaid?: number;
  remaining?: number;
}

export function loanBalance(loan: Loan): number {
  return loan.outstandingPrincipal + loan.outstandingInterest;
}

export function repayLoan(state: GameState, amount: number): RepayResult {
  if (!state.loan) return { ok: false, reason: 'You have no loan to repay.' };
  if (amount <= 0) return { ok: false, reason: 'Repayment must be positive.' };
  if (amount > state.money) return { ok: false, reason: 'You do not have that much money.' };
  const balance = loanBalance(state.loan);
  const pay = Math.min(amount, balance);
  state.money -= pay;

  let remaining = pay;
  const interestPay = Math.min(state.loan.outstandingInterest, remaining);
  state.loan.outstandingInterest -= interestPay;
  remaining -= interestPay;
  state.loan.outstandingPrincipal -= remaining;

  const newBalance = loanBalance(state.loan);
  if (newBalance <= 0.005) {
    state.loan = null;
    state.log.push(`Loan paid in full ($${pay.toFixed(2)}).`);
    return { ok: true, amountPaid: pay, remaining: 0 };
  }
  state.log.push(`Paid $${pay.toFixed(2)} toward your loan. $${newBalance.toFixed(2)} remains.`);
  return { ok: true, amountPaid: pay, remaining: newBalance };
}

export function loanPenalty(state: GameState): number {
  if (!state.loan) return 0;
  return Math.round(loanBalance(state.loan) * LOAN_PENALTY_MULTIPLIER);
}

export function canRepayHere(state: GameState): boolean {
  if (!state.loan) return false;
  if (state.currentEdgeId !== null) return false;
  const id = state.currentNodeId;
  if (id === 'independence') return true;
  return id.startsWith('fort-');
}
