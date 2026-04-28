import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import {
  addJournalEntry,
  entriesByKind,
  journalEntries,
  journalNewestFirst,
  JOURNAL_MAX_ENTRIES,
} from '../../src/core/journal';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('journal', () => {
  it('seeds a depart entry on game start', () => {
    const s = createInitialState(opts());
    expect(journalEntries(s).length).toBe(1);
    expect(journalEntries(s)[0].kind).toBe('depart');
  });

  it('addJournalEntry stamps the current date and node', () => {
    const s = createInitialState(opts());
    const e = addJournalEntry(s, 'note', 'Saw a buffalo.', 'fort-kearney');
    expect(e.date).toEqual(s.date);
    expect(e.nodeId).toBe('fort-kearney');
    expect(e.text).toBe('Saw a buffalo.');
  });

  it('omits nodeId when not provided', () => {
    const s = createInitialState(opts());
    const e = addJournalEntry(s, 'note', 'Quiet day.');
    expect(e.nodeId).toBeUndefined();
  });

  it('caps entries at JOURNAL_MAX_ENTRIES', () => {
    const s = createInitialState(opts());
    for (let i = 0; i < JOURNAL_MAX_ENTRIES + 50; i++) {
      addJournalEntry(s, 'note', `entry ${i}`);
    }
    expect(s.journal.length).toBe(JOURNAL_MAX_ENTRIES);
    expect(s.journal[s.journal.length - 1].text).toContain(`entry ${JOURNAL_MAX_ENTRIES + 49}`);
  });

  it('newest-first reverses order', () => {
    const s = createInitialState(opts());
    addJournalEntry(s, 'note', 'A');
    addJournalEntry(s, 'note', 'B');
    const rev = journalNewestFirst(s);
    expect(rev[0].text).toBe('B');
    expect(rev[rev.length - 1].text).toBe('Set out from Independence, Missouri.');
  });

  it('filters by kind', () => {
    const s = createInitialState(opts());
    addJournalEntry(s, 'event', 'Storm.');
    addJournalEntry(s, 'death', 'Mary died.');
    addJournalEntry(s, 'event', 'Wolf.');
    expect(entriesByKind(s, 'event').length).toBe(2);
    expect(entriesByKind(s, 'death').length).toBe(1);
  });
});
