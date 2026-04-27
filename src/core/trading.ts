import type { GameState } from './types';
import type { Rng } from './rng';
import type { Item } from './store';

export interface TradeOffer {
  give: { item: Item; quantity: number };
  receive: { item: Item; quantity: number };
}

const TRADE_PAIRS: Array<[Item, Item]> = [
  ['food', 'clothing'],
  ['clothing', 'food'],
  ['ammunition', 'food'],
  ['food', 'ammunition'],
  ['clothing', 'ammunition'],
  ['ammunition', 'clothing'],
  ['oxen', 'food'],
  ['food', 'oxen'],
  ['wheels', 'food'],
  ['food', 'wheels'],
];

export function generateOffer(rng: Rng): TradeOffer {
  const [give, receive] = rng.pick(TRADE_PAIRS);
  const giveQty = give === 'food' ? (rng.int(40) + 10) : give === 'ammunition' ? (rng.int(20) + 5) : (rng.int(2) + 1);
  const receiveQty = receive === 'food' ? (rng.int(40) + 10) : receive === 'ammunition' ? (rng.int(20) + 5) : (rng.int(2) + 1);
  return { give: { item: give, quantity: giveQty }, receive: { item: receive, quantity: receiveQty } };
}

export type TradeResult = { ok: true } | { ok: false; reason: string };

export function applyTrade(state: GameState, offer: TradeOffer): TradeResult {
  if (state.inventory[offer.give.item] < offer.give.quantity) {
    return { ok: false, reason: `You don't have enough ${offer.give.item}.` };
  }
  state.inventory[offer.give.item] -= offer.give.quantity;
  state.inventory[offer.receive.item] += offer.receive.quantity;
  return { ok: true };
}
