import { describe, it, expect } from 'vitest';
import {
  LANDMARKS,
  DEFAULT_ROUTE,
  currentLandmark,
  nextLandmark,
  milesToNextLandmark,
  getLandmark,
} from '../../src/core/landmarks';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';
import { totalRouteMiles } from '../../src/core/route';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('landmarks', () => {
  it('has 26 landmarks starting at Independence and ending at Willamette', () => {
    expect(LANDMARKS).toHaveLength(26);
    expect(LANDMARKS[0].name).toBe('Independence');
    expect(LANDMARKS[LANDMARKS.length - 1].name).toBe('Willamette Valley');
    expect(LANDMARKS[LANDMARKS.length - 1].kind).toBe('destination');
  });

  it('main route miles total 2250', () => {
    expect(totalRouteMiles(DEFAULT_ROUTE)).toBe(2250);
  });

  it('has the expected junctions', () => {
    const southPass = DEFAULT_ROUTE.outgoing['south-pass'];
    expect(southPass).toHaveLength(2);
    expect(southPass.map((e) => e.toNodeId).sort()).toEqual(['fort-bridger', 'green-river']);
    const dalles = DEFAULT_ROUTE.outgoing['the-dalles'];
    expect(dalles).toHaveLength(2);
    expect(dalles.map((e) => e.toNodeId).sort()).toEqual(['barlow-road', 'raft-columbia']);
  });

  it('every node except destination has at least one outgoing edge', () => {
    for (const id of Object.keys(DEFAULT_ROUTE.nodes)) {
      if (id === DEFAULT_ROUTE.destinationNodeId) continue;
      expect(DEFAULT_ROUTE.outgoing[id].length).toBeGreaterThan(0);
    }
  });

  it('every branch reaches the destination', () => {
    const reachable = new Set<string>();
    const visit = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const e of DEFAULT_ROUTE.outgoing[id] ?? []) visit(e.toNodeId);
    };
    visit(DEFAULT_ROUTE.startNodeId);
    expect(reachable.has(DEFAULT_ROUTE.destinationNodeId)).toBe(true);
    expect(reachable.size).toBe(Object.keys(DEFAULT_ROUTE.nodes).length);
  });

  it('currentLandmark returns landmark at current node', () => {
    const s = createInitialState(opts());
    expect(currentLandmark(s).name).toBe('Independence');
  });

  it('nextLandmark returns following landmark on linear trail', () => {
    const s = createInitialState(opts());
    expect(nextLandmark(s)?.name).toBe('Kansas River Crossing');
  });

  it('milesToNextLandmark computes remaining distance from current state', () => {
    const s = createInitialState(opts());
    expect(milesToNextLandmark(s)).toBe(102);
  });

  it('getLandmark looks up a node by id', () => {
    expect(getLandmark('fort-laramie').name).toBe('Fort Laramie');
    expect(() => getLandmark('not-real')).toThrow(/Unknown node/);
  });
});
