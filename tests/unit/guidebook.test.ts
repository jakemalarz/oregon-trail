import { describe, it, expect } from 'vitest';
import { GUIDEBOOK, allGuidebookEntries, guidebookEntry } from '../../src/core/guidebook';
import { DEFAULT_ROUTE } from '../../src/core/landmarks';

describe('guidebook', () => {
  it('has an entry for every landmark in the route', () => {
    for (const id of Object.keys(DEFAULT_ROUTE.nodes)) {
      expect(GUIDEBOOK[id], `missing entry for ${id}`).toBeDefined();
    }
  });

  it('every entry has nonempty title and body', () => {
    for (const e of Object.values(GUIDEBOOK)) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.body.length).toBeGreaterThan(20);
    }
  });

  it('guidebookEntry returns by id, undefined otherwise', () => {
    expect(guidebookEntry('chimney-rock')?.title).toContain('Chimney Rock');
    expect(guidebookEntry('not-a-real-place')).toBeUndefined();
  });

  it('allGuidebookEntries returns each id once', () => {
    const all = allGuidebookEntries();
    const ids = all.map((e) => e.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('willamette');
    expect(ids).toContain('independence');
  });
});
