import { describe, it, expect } from 'vitest';
import { ALL_ENVIRONMENTS, currentEnvironment } from '../../src/core/environment';
import { DEFAULT_ROUTE } from '../../src/core/landmarks';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('environment', () => {
  it('exposes the five canonical environments', () => {
    expect(ALL_ENVIRONMENTS).toEqual([
      'plains',
      'forest',
      'mountains',
      'desert',
      'river-valley',
    ]);
  });

  it('returns the node environment when AT a node (no edge)', () => {
    const s = createInitialState(opts());
    expect(currentEnvironment(DEFAULT_ROUTE, s)).toBe('plains');
  });

  it('returns the edge environment while traveling', () => {
    const s = createInitialState(opts());
    s.currentNodeId = 'south-pass';
    s.currentEdgeId = 'south-pass->fort-bridger';
    s.milesIntoEdge = 10;
    expect(currentEnvironment(DEFAULT_ROUTE, s)).toBe('mountains');

    s.currentEdgeId = 'fort-hall->snake-river';
    s.currentNodeId = 'fort-hall';
    expect(currentEnvironment(DEFAULT_ROUTE, s)).toBe('river-valley');
  });

  it('falls back to plains when a node has no environment field', () => {
    const fakeRoute = {
      ...DEFAULT_ROUTE,
      nodes: { ...DEFAULT_ROUTE.nodes, 'no-env': { id: 'no-env', name: 'X', kind: 'town' as const } },
    };
    const s = createInitialState(opts());
    s.currentNodeId = 'no-env';
    s.currentEdgeId = null;
    expect(currentEnvironment(fakeRoute, s)).toBe('plains');
  });
});
