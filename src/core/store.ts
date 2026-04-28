import type { GameState } from './types';

export type Item = 'oxen' | 'food' | 'clothing' | 'ammunition' | 'wheels' | 'axles' | 'tongues';

export interface PriceList {
  oxen: number;
  food: number;
  clothing: number;
  ammunition: number;
  wheels: number;
  axles: number;
  tongues: number;
}

export const INDEPENDENCE_PRICES: PriceList = {
  oxen: 40,
  food: 0.2,
  clothing: 10,
  ammunition: 2,
  wheels: 10,
  axles: 10,
  tongues: 10,
};

export const FORT_PRICE_MULTIPLIERS: Record<string, number> = {
  'fort-kearney': 2,
  'fort-laramie': 2,
  'fort-bridger': 2.5,
  'fort-hall': 2.5,
  'fort-boise': 3,
  'fort-walla-walla': 3,
  'fort-vancouver': 3,
};

export interface PurchaseRequest {
  item: Item;
  quantity: number;
}

export type PurchaseResult = { ok: true; cost: number } | { ok: false; reason: string };

export const AMMO_BOX_SIZE = 20;

export function priceFor(item: Item, prices: PriceList, qty: number): number {
  if (item === 'food') return prices.food * qty;
  if (item === 'ammunition') return prices.ammunition * qty;
  return prices[item] * qty;
}

export function purchase(
  state: GameState,
  prices: PriceList,
  req: PurchaseRequest,
): PurchaseResult {
  if (req.quantity <= 0) return { ok: false, reason: 'Quantity must be positive.' };
  if (!Number.isFinite(req.quantity)) return { ok: false, reason: 'Invalid quantity.' };

  if (req.item === 'oxen') {
    const yokes = req.quantity;
    if (yokes < 1) return { ok: false, reason: 'You need at least one yoke of oxen.' };
    if (state.inventory.oxen + yokes * 2 > 12) return { ok: false, reason: 'Too many oxen.' };
    const cost = prices.oxen * yokes * 2;
    if (cost > state.money) return { ok: false, reason: 'Not enough money.' };
    state.money -= cost;
    state.inventory.oxen += yokes * 2;
    return { ok: true, cost };
  }

  const cost = priceFor(req.item, prices, req.quantity);
  if (cost > state.money) return { ok: false, reason: 'Not enough money.' };
  if (req.item === 'wheels' && state.inventory.wheels + req.quantity > 3)
    return { ok: false, reason: 'You have enough spare wheels.' };
  if (req.item === 'axles' && state.inventory.axles + req.quantity > 3)
    return { ok: false, reason: 'You have enough spare axles.' };
  if (req.item === 'tongues' && state.inventory.tongues + req.quantity > 3)
    return { ok: false, reason: 'You have enough spare tongues.' };

  state.money -= cost;
  state.inventory[req.item] += req.quantity;
  return { ok: true, cost };
}

export function priceListFor(landmarkId: string): PriceList {
  const mult = FORT_PRICE_MULTIPLIERS[landmarkId];
  if (!mult) return INDEPENDENCE_PRICES;
  return {
    oxen: INDEPENDENCE_PRICES.oxen * mult,
    food: INDEPENDENCE_PRICES.food * mult,
    clothing: INDEPENDENCE_PRICES.clothing * mult,
    ammunition: INDEPENDENCE_PRICES.ammunition * mult,
    wheels: INDEPENDENCE_PRICES.wheels * mult,
    axles: INDEPENDENCE_PRICES.axles * mult,
    tongues: INDEPENDENCE_PRICES.tongues * mult,
  };
}

export function isReadyToDepart(state: GameState): { ready: boolean; reason?: string } {
  if (state.inventory.oxen < 2) return { ready: false, reason: 'You need at least one yoke of oxen (2).' };
  if (state.inventory.food < 50) return { ready: false, reason: 'You should buy more food.' };
  if (state.inventory.clothing < 2) return { ready: false, reason: 'You will need clothing for the journey.' };
  return { ready: true };
}
