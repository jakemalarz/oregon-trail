import type { GameState, JournalEntry, JournalKind } from './types';

export const JOURNAL_MAX_ENTRIES = 200;

export function addJournalEntry(
  state: GameState,
  kind: JournalKind,
  text: string,
  nodeId?: string,
): JournalEntry {
  const entry: JournalEntry = {
    date: { ...state.date },
    kind,
    text,
    ...(nodeId ? { nodeId } : {}),
  };
  state.journal.push(entry);
  if (state.journal.length > JOURNAL_MAX_ENTRIES) {
    state.journal.splice(0, state.journal.length - JOURNAL_MAX_ENTRIES);
  }
  return entry;
}

export function journalEntries(state: GameState): JournalEntry[] {
  return state.journal;
}

export function journalNewestFirst(state: GameState): JournalEntry[] {
  return [...state.journal].reverse();
}

export function entriesByKind(state: GameState, kind: JournalKind): JournalEntry[] {
  return state.journal.filter((e) => e.kind === kind);
}
