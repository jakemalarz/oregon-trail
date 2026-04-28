import type { GameState } from '../core/types';
import {
  applyForLoan,
  canRepayHere,
  loanBalance,
  LOAN_OPTIONS,
  LOAN_RATE_ANNUAL,
  repayLoan,
} from '../core/banking';
import { el } from './dom';
import { beep, blip } from './sound';
import { photoFrame } from './photoFrame';

export interface BankScreenDeps {
  state: GameState;
  onClose: () => void;
}

export function renderBankScreen(root: HTMLElement, deps: BankScreenDeps): void {
  const { state, onClose } = deps;
  const atIndependence = state.currentNodeId === 'independence' && state.milesTraveled === 0;
  const repayHere = canRepayHere(state);

  const heading = atIndependence
    ? 'Bank of Independence'
    : 'Loan Office';
  root.appendChild(el('h2', { text: heading }));
  root.appendChild(photoFrame({ imageId: 'bank', caption: heading }));

  if (atIndependence && !state.loan) {
    root.appendChild(el('p', {
      class: 'center',
      text: `Take a loan to outfit your wagon. ${(LOAN_RATE_ANNUAL * 100).toFixed(0)}% APR, accrued daily.`,
    }));
    const menu = el('div', { class: 'menu' });
    for (const amount of LOAN_OPTIONS) {
      const b = el('button', { class: 'menu-item', text: `Borrow $${amount}` });
      b.setAttribute('data-testid', `loan-${amount}`);
      b.addEventListener('click', () => {
        const r = applyForLoan(state, amount);
        if (r.ok) beep(); else { state.log.push(r.reason ?? 'Loan declined.'); blip(); }
        renderRefresh();
      });
      menu.appendChild(b);
    }
    root.appendChild(menu);
  }

  if (state.loan) {
    const bal = loanBalance(state.loan);
    root.appendChild(el('p', {
      class: 'center',
      html: `<b>Outstanding loan:</b> $${bal.toFixed(2)} ` +
        `(principal $${state.loan.outstandingPrincipal.toFixed(2)}, ` +
        `interest $${state.loan.outstandingInterest.toFixed(2)}, ` +
        `${state.loan.daysAccrued} days accrued)`,
    }));

    if (repayHere) {
      const row = el('div', { class: 'row' });
      const input = el('input', { type: 'number', value: Math.min(state.money, bal).toFixed(2) });
      input.setAttribute('data-testid', 'repay-amount');
      (input as HTMLInputElement).min = '0';
      (input as HTMLInputElement).step = '1';
      input.style.width = '110px';
      const pay = el('button', { class: 'primary', text: 'Repay' });
      pay.setAttribute('data-testid', 'repay');
      pay.addEventListener('click', () => {
        const amount = parseFloat((input as HTMLInputElement).value || '0');
        if (!Number.isFinite(amount) || amount <= 0) { blip(); return; }
        const r = repayLoan(state, amount);
        if (r.ok) beep(); else { state.log.push(r.reason ?? ''); blip(); }
        renderRefresh();
      });
      const payAll = el('button', { text: 'Repay all I can' });
      payAll.setAttribute('data-testid', 'repay-all');
      payAll.addEventListener('click', () => {
        const r = repayLoan(state, Math.min(state.money, bal));
        if (r.ok) beep(); else { state.log.push(r.reason ?? ''); blip(); }
        renderRefresh();
      });
      row.append(input, pay, payAll);
      root.appendChild(row);
    } else if (!atIndependence) {
      root.appendChild(el('p', { class: 'dim center', text: 'You can repay your loan at any fort or back in Independence.' }));
    }
  }

  if (!atIndependence && !state.loan) {
    root.appendChild(el('p', { class: 'dim center', text: 'You have no loan outstanding.' }));
  }

  const back = el('button', { class: atIndependence || repayHere ? '' : 'primary', text: 'Leave the bank' });
  back.setAttribute('data-testid', 'leave-bank');
  back.addEventListener('click', () => { beep(); onClose(); });
  root.appendChild(back);

  function renderRefresh(): void {
    root.innerHTML = '';
    renderBankScreen(root, deps);
  }
}
