import type { GameState, Landmark, RouteEdge, RouteGraph } from './types';

export function buildRouteGraph(
  nodes: Landmark[],
  edges: RouteEdge[],
  startNodeId: string,
  destinationNodeId: string,
): RouteGraph {
  const nodeMap: Record<string, Landmark> = {};
  for (const n of nodes) {
    if (nodeMap[n.id]) throw new Error(`Duplicate node id: ${n.id}`);
    nodeMap[n.id] = n;
  }
  const edgeMap: Record<string, RouteEdge> = {};
  const outgoing: Record<string, RouteEdge[]> = {};
  for (const id of Object.keys(nodeMap)) outgoing[id] = [];
  for (const e of edges) {
    if (edgeMap[e.id]) throw new Error(`Duplicate edge id: ${e.id}`);
    if (!nodeMap[e.fromNodeId]) throw new Error(`Edge ${e.id} from unknown node: ${e.fromNodeId}`);
    if (!nodeMap[e.toNodeId]) throw new Error(`Edge ${e.id} to unknown node: ${e.toNodeId}`);
    if (e.miles <= 0) throw new Error(`Edge ${e.id} must have positive miles`);
    edgeMap[e.id] = e;
    outgoing[e.fromNodeId].push(e);
  }
  if (!nodeMap[startNodeId]) throw new Error(`Unknown startNodeId: ${startNodeId}`);
  if (!nodeMap[destinationNodeId]) throw new Error(`Unknown destinationNodeId: ${destinationNodeId}`);
  return { nodes: nodeMap, edges: edgeMap, outgoing, startNodeId, destinationNodeId };
}

export function getNode(graph: RouteGraph, nodeId: string): Landmark {
  const n = graph.nodes[nodeId];
  if (!n) throw new Error(`Unknown node id: ${nodeId}`);
  return n;
}

export function getEdge(graph: RouteGraph, edgeId: string): RouteEdge {
  const e = graph.edges[edgeId];
  if (!e) throw new Error(`Unknown edge id: ${edgeId}`);
  return e;
}

export function outgoingEdges(graph: RouteGraph, nodeId: string): RouteEdge[] {
  return graph.outgoing[nodeId] ?? [];
}

export function isJunction(graph: RouteGraph, nodeId: string): boolean {
  return outgoingEdges(graph, nodeId).length > 1;
}

export function currentNode(graph: RouteGraph, state: GameState): Landmark {
  return getNode(graph, state.currentNodeId);
}

export function currentEdge(graph: RouteGraph, state: GameState): RouteEdge | null {
  return state.currentEdgeId ? getEdge(graph, state.currentEdgeId) : null;
}

export function nextNode(graph: RouteGraph, state: GameState): Landmark | undefined {
  const edge = currentEdge(graph, state);
  if (edge) return getNode(graph, edge.toNodeId);
  const outs = outgoingEdges(graph, state.currentNodeId);
  if (outs.length === 1) return getNode(graph, outs[0].toNodeId);
  return undefined;
}

export function milesToNextNode(graph: RouteGraph, state: GameState): number {
  const edge = currentEdge(graph, state);
  if (edge) return Math.max(0, edge.miles - state.milesIntoEdge);
  const outs = outgoingEdges(graph, state.currentNodeId);
  if (outs.length === 1) return outs[0].miles;
  return 0;
}

export function totalRouteMiles(graph: RouteGraph): number {
  let total = 0;
  let cur = graph.startNodeId;
  const seen = new Set<string>();
  while (cur !== graph.destinationNodeId) {
    if (seen.has(cur)) throw new Error(`Cycle detected at ${cur}`);
    seen.add(cur);
    const outs = graph.outgoing[cur] ?? [];
    if (outs.length === 0) throw new Error(`Dead end at ${cur}`);
    const next = outs[0];
    total += next.miles;
    cur = next.toNodeId;
  }
  return total;
}

export function chooseExit(state: GameState, graph: RouteGraph, edgeId: string): void {
  const edge = getEdge(graph, edgeId);
  if (edge.fromNodeId !== state.currentNodeId) {
    throw new Error(`Edge ${edgeId} does not start at current node ${state.currentNodeId}`);
  }
  state.currentEdgeId = edge.id;
  state.milesIntoEdge = 0;
  state.pendingChoice = null;
}

export function autoDepart(state: GameState, graph: RouteGraph): boolean {
  if (state.currentEdgeId !== null) return true;
  const outs = outgoingEdges(graph, state.currentNodeId);
  if (outs.length === 0) return false;
  if (outs.length === 1) {
    chooseExit(state, graph, outs[0].id);
    return true;
  }
  state.pendingChoice = state.currentNodeId;
  return false;
}

export function arriveAtNode(state: GameState, graph: RouteGraph, nodeId: string): void {
  state.currentNodeId = nodeId;
  state.currentEdgeId = null;
  state.milesIntoEdge = 0;
  if (!state.visitedNodeIds.includes(nodeId)) state.visitedNodeIds.push(nodeId);
  if (isJunction(graph, nodeId)) state.pendingChoice = nodeId;
}
