import { describe, it, expect } from 'vitest';
import {
  buildRouteGraph,
  getNode,
  getEdge,
  outgoingEdges,
  isJunction,
  currentNode,
  currentEdge,
  nextNode,
  milesToNextNode,
  totalRouteMiles,
  chooseExit,
  autoDepart,
  arriveAtNode,
} from '../../src/core/route';
import type { Landmark, RouteEdge } from '../../src/core/types';
import { DEFAULT_ROUTE } from '../../src/core/landmarks';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

const aN: Landmark = { id: 'a', name: 'A', kind: 'town', environment: 'plains' };
const bN: Landmark = { id: 'b', name: 'B', kind: 'fort', environment: 'plains' };
const cN: Landmark = { id: 'c', name: 'C', kind: 'fort', environment: 'plains' };
const dN: Landmark = { id: 'd', name: 'D', kind: 'destination', environment: 'plains' };

const ab: RouteEdge = { id: 'a->b', fromNodeId: 'a', toNodeId: 'b', miles: 10, environment: 'plains' };
const bc: RouteEdge = { id: 'b->c', fromNodeId: 'b', toNodeId: 'c', miles: 20, environment: 'plains' };
const bd: RouteEdge = { id: 'b->d', fromNodeId: 'b', toNodeId: 'd', miles: 30, environment: 'plains' };
const cd: RouteEdge = { id: 'c->d', fromNodeId: 'c', toNodeId: 'd', miles: 15, environment: 'plains' };

describe('route graph', () => {
  it('builds a graph with nodes, edges, and outgoing index', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    expect(getNode(g, 'a').name).toBe('A');
    expect(getEdge(g, 'a->b').miles).toBe(10);
    expect(outgoingEdges(g, 'b')).toHaveLength(2);
    expect(isJunction(g, 'b')).toBe(true);
    expect(isJunction(g, 'a')).toBe(false);
  });

  it('rejects duplicate nodes and edges', () => {
    expect(() => buildRouteGraph([aN, aN], [], 'a', 'a')).toThrow(/Duplicate node/);
    expect(() => buildRouteGraph([aN, bN], [ab, ab], 'a', 'b')).toThrow(/Duplicate edge/);
  });

  it('rejects edges referring to unknown nodes', () => {
    const bad: RouteEdge = { id: 'x->y', fromNodeId: 'x', toNodeId: 'y', miles: 1, environment: 'plains' };
    expect(() => buildRouteGraph([aN, bN], [bad], 'a', 'b')).toThrow(/unknown node/);
  });

  it('rejects non-positive miles', () => {
    const bad: RouteEdge = { id: 'a->b', fromNodeId: 'a', toNodeId: 'b', miles: 0, environment: 'plains' };
    expect(() => buildRouteGraph([aN, bN], [bad], 'a', 'b')).toThrow(/positive miles/);
  });

  it('totalRouteMiles follows first outgoing edge to destination', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, cd], 'a', 'd');
    expect(totalRouteMiles(g)).toBe(45);
  });

  it('autoDepart picks single outgoing edge automatically', () => {
    const s = createInitialState(opts());
    expect(s.currentEdgeId).toBeNull();
    const ok = autoDepart(s, DEFAULT_ROUTE);
    expect(ok).toBe(true);
    expect(s.currentEdgeId).toBe('independence->kansas-river');
    expect(s.pendingChoice).toBeNull();
  });

  it('autoDepart at junction sets pendingChoice and returns false', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    const s = createInitialState(opts());
    s.currentNodeId = 'b';
    s.currentEdgeId = null;
    const ok = autoDepart(s, g);
    expect(ok).toBe(false);
    expect(s.pendingChoice).toBe('b');
  });

  it('chooseExit clears pendingChoice and sets edge', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    const s = createInitialState(opts());
    s.currentNodeId = 'b';
    s.currentEdgeId = null;
    s.pendingChoice = 'b';
    chooseExit(s, g, 'b->d');
    expect(s.currentEdgeId).toBe('b->d');
    expect(s.milesIntoEdge).toBe(0);
    expect(s.pendingChoice).toBeNull();
  });

  it('chooseExit rejects edges that do not start at current node', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    const s = createInitialState(opts());
    s.currentNodeId = 'a';
    expect(() => chooseExit(s, g, 'b->d')).toThrow(/does not start at/);
  });

  it('arriveAtNode records visit and flags junction', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    const s = createInitialState(opts());
    s.currentNodeId = 'a';
    s.currentEdgeId = 'a->b';
    s.milesIntoEdge = 10;
    s.visitedNodeIds = ['a'];
    arriveAtNode(s, g, 'b');
    expect(s.currentNodeId).toBe('b');
    expect(s.currentEdgeId).toBeNull();
    expect(s.milesIntoEdge).toBe(0);
    expect(s.visitedNodeIds).toEqual(['a', 'b']);
    expect(s.pendingChoice).toBe('b');
  });

  it('currentNode and currentEdge reflect state', () => {
    const s = createInitialState(opts());
    expect(currentNode(DEFAULT_ROUTE, s).id).toBe('independence');
    expect(currentEdge(DEFAULT_ROUTE, s)).toBeNull();
    autoDepart(s, DEFAULT_ROUTE);
    expect(currentEdge(DEFAULT_ROUTE, s)?.toNodeId).toBe('kansas-river');
  });

  it('nextNode returns following node along current or sole exit', () => {
    const s = createInitialState(opts());
    expect(nextNode(DEFAULT_ROUTE, s)?.id).toBe('kansas-river');
    autoDepart(s, DEFAULT_ROUTE);
    expect(nextNode(DEFAULT_ROUTE, s)?.id).toBe('kansas-river');
  });

  it('milesToNextNode returns remaining edge miles', () => {
    const s = createInitialState(opts());
    expect(milesToNextNode(DEFAULT_ROUTE, s)).toBe(102);
    autoDepart(s, DEFAULT_ROUTE);
    s.milesIntoEdge = 30;
    expect(milesToNextNode(DEFAULT_ROUTE, s)).toBe(72);
  });

  it('nextNode and milesToNextNode return undefined / 0 at junctions or dead ends', () => {
    const g = buildRouteGraph([aN, bN, cN, dN], [ab, bc, bd, cd], 'a', 'd');
    const s = createInitialState(opts());
    s.currentNodeId = 'b';
    s.currentEdgeId = null;
    expect(nextNode(g, s)).toBeUndefined();
    expect(milesToNextNode(g, s)).toBe(0);
    s.currentNodeId = 'd';
    expect(nextNode(g, s)).toBeUndefined();
    expect(milesToNextNode(g, s)).toBe(0);
  });

  it('autoDepart returns false at a dead-end node', () => {
    const s = createInitialState(opts());
    s.currentNodeId = 'willamette';
    s.currentEdgeId = null;
    expect(autoDepart(s, DEFAULT_ROUTE)).toBe(false);
  });

  it('autoDepart is idempotent when an edge is already chosen', () => {
    const s = createInitialState(opts());
    autoDepart(s, DEFAULT_ROUTE);
    const edgeId = s.currentEdgeId;
    expect(autoDepart(s, DEFAULT_ROUTE)).toBe(true);
    expect(s.currentEdgeId).toBe(edgeId);
  });

  it('getEdge / getNode throw on unknown ids', () => {
    expect(() => getNode(DEFAULT_ROUTE, 'nope')).toThrow(/Unknown node/);
    expect(() => getEdge(DEFAULT_ROUTE, 'nope')).toThrow(/Unknown edge/);
  });

  it('totalRouteMiles detects cycles', () => {
    const ba: RouteEdge = { id: 'b->a', fromNodeId: 'b', toNodeId: 'a', miles: 5, environment: 'plains' };
    const g = buildRouteGraph([aN, bN, cN], [ab, ba], 'a', 'c');
    expect(() => totalRouteMiles(g)).toThrow(/Cycle/);
  });

  it('totalRouteMiles detects dead ends', () => {
    const g = buildRouteGraph([aN, bN, cN], [ab], 'a', 'c');
    expect(() => totalRouteMiles(g)).toThrow(/Dead end/);
  });
});
