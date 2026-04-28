import type { GameState, Month } from './types';
import type { Rng } from './rng';

const STORAGE_KEY = 'oregon-trail-tombstones-v1';
export const TOMBSTONE_CAP = 50;
export const EPITAPH_MAX_LEN = 60;
export const ENCOUNTER_DAILY_CHANCE = 0.05;

export interface TombstoneRecord {
  name: string;
  epitaph: string;
  nodeId: string;
  date: { month: Month; day: number; year: number };
  seed: number;
}

export type TombstoneStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): TombstoneStorage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function sanitizeEpitaph(input: string): string {
  return input
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, EPITAPH_MAX_LEN);
}

export function loadTombstones(storage: TombstoneStorage | null = defaultStorage()): TombstoneRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord);
  } catch {
    return [];
  }
}

export function saveTombstone(rec: TombstoneRecord, storage: TombstoneStorage | null = defaultStorage()): void {
  if (!storage) return;
  const list = loadTombstones(storage);
  list.unshift(rec);
  while (list.length > TOMBSTONE_CAP) list.pop();
  storage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function tombstonesAtNode(nodeId: string, storage: TombstoneStorage | null = defaultStorage()): TombstoneRecord[] {
  return loadTombstones(storage).filter((t) => t.nodeId === nodeId);
}

export function makeTombstone(state: GameState, nameOverride?: string): TombstoneRecord {
  const leader = state.party[0];
  return {
    name: nameOverride ?? leader?.name ?? 'Unknown',
    epitaph: sanitizeEpitaph(state.epitaph ?? 'Rest in peace.'),
    nodeId: state.currentNodeId,
    date: { ...state.date },
    seed: state.rngSeed,
  };
}

export function maybeEncounterTombstone(
  state: GameState,
  rng: Rng,
  storage: TombstoneStorage | null = defaultStorage(),
): TombstoneRecord | null {
  if (!rng.chance(ENCOUNTER_DAILY_CHANCE)) return null;
  const here = tombstonesAtNode(state.currentNodeId, storage);
  if (here.length === 0) return null;
  const idx = rng.int(here.length);
  return here[idx];
}

function isValidRecord(x: unknown): x is TombstoneRecord {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    typeof r.epitaph === 'string' &&
    typeof r.nodeId === 'string' &&
    typeof r.seed === 'number' &&
    !!r.date &&
    typeof r.date === 'object'
  );
}
