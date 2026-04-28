import type { Environment, GameState, RouteGraph } from './types';
import { currentEdge, currentNode } from './route';

export const ALL_ENVIRONMENTS: readonly Environment[] = [
  'plains',
  'forest',
  'mountains',
  'desert',
  'river-valley',
] as const;

export function currentEnvironment(graph: RouteGraph, state: GameState): Environment {
  const edge = currentEdge(graph, state);
  if (edge) return edge.environment;
  const node = currentNode(graph, state);
  return node.environment ?? 'plains';
}
