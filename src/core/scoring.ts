import type { GameState, ScoreEntry } from './types';
import { PROFESSION_MULTIPLIER, aliveCount } from './state';
import { formatDate } from './calendar';

export function computeScore(state: GameState): number {
  if (!state.victory) return 0;
  const survivors = aliveCount(state);
  const inv = state.inventory;
  const possessions =
    survivors * 100 +
    inv.oxen * 4 +
    Math.floor(inv.food / 10) +
    inv.clothing * 5 +
    Math.floor(inv.ammunition / 5) +
    inv.wheels * 4 +
    inv.axles * 4 +
    inv.tongues * 4 +
    state.money * 2;
  return possessions * PROFESSION_MULTIPLIER[state.profession];
}

export function makeScoreEntry(state: GameState): ScoreEntry {
  return {
    name: state.party[0]?.name ?? 'Unknown',
    score: computeScore(state),
    profession: state.profession,
    date: formatDate(state.date),
    arrived: state.victory,
  };
}

const STORAGE_KEY = 'oregon-trail-top-ten';

export interface ScoreStorage {
  load(): ScoreEntry[];
  save(entries: ScoreEntry[]): void;
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // ignore
  }
  return null;
}

export function loadTopTen(storage: ScoreStorage = browserStorage()): ScoreEntry[] {
  return storage.load();
}

export function recordScore(
  entry: ScoreEntry,
  storage: ScoreStorage = browserStorage(),
): ScoreEntry[] {
  const list = storage.load();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, 10);
  storage.save(trimmed);
  return trimmed;
}

export function browserStorage(): ScoreStorage {
  return {
    load(): ScoreEntry[] {
      const ls = safeStorage();
      if (!ls) return [];
      const raw = ls.getItem(STORAGE_KEY);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as ScoreEntry[];
      } catch {
        return [];
      }
    },
    save(entries: ScoreEntry[]): void {
      const ls = safeStorage();
      if (!ls) return;
      ls.setItem(STORAGE_KEY, JSON.stringify(entries));
    },
  };
}

export function checkGameOver(state: GameState): { over: boolean; reason?: string } {
  if (state.victory) return { over: true, reason: 'You arrived in Oregon!' };
  if (aliveCount(state) === 0) return { over: true, reason: 'Your entire party has died.' };
  if (state.inventory.oxen <= 0 && !state.victory && state.milesTraveled > 0) {
    return { over: true, reason: 'You have no oxen left to pull the wagon.' };
  }
  return { over: false };
}
