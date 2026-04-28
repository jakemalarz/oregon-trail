import type { Environment, Landmark, RouteEdge, RouteGraph } from './types';
import { buildRouteGraph, getNode, milesToNextNode, nextNode, currentNode } from './route';
import type { GameState } from './types';

interface NodeDef extends Landmark {}
interface EdgeDef {
  id: string;
  from: string;
  to: string;
  miles: number;
  environment: Environment;
  difficulty?: 'easy' | 'normal' | 'hard';
  description?: string;
}

const NODE_DEFS: NodeDef[] = [
  { id: 'independence', name: 'Independence', kind: 'town', environment: 'plains' },
  { id: 'kansas-river', name: 'Kansas River Crossing', kind: 'river', riverDepth: 2.5, riverWidth: 620, ferry: false, environment: 'plains' },
  { id: 'big-blue', name: 'Big Blue River Crossing', kind: 'river', riverDepth: 3.0, riverWidth: 530, ferry: false, environment: 'plains' },
  { id: 'fort-kearney', name: 'Fort Kearney', kind: 'fort', environment: 'plains' },
  { id: 'chimney-rock', name: 'Chimney Rock', kind: 'natural', environment: 'plains' },
  { id: 'fort-laramie', name: 'Fort Laramie', kind: 'fort', environment: 'plains' },
  { id: 'register-cliff', name: 'Register Cliff', kind: 'natural', environment: 'plains' },
  { id: 'independence-rock', name: 'Independence Rock', kind: 'natural', environment: 'plains' },
  { id: 'devils-gate', name: "Devil's Gate", kind: 'natural', environment: 'plains' },
  { id: 'south-pass', name: 'South Pass', kind: 'natural', environment: 'mountains' },
  { id: 'fort-bridger', name: 'Fort Bridger', kind: 'fort', environment: 'mountains' },
  { id: 'green-river', name: 'Green River Crossing', kind: 'river', riverDepth: 4.5, riverWidth: 400, ferry: true, environment: 'mountains' },
  { id: 'soda-springs', name: 'Soda Springs', kind: 'natural', environment: 'mountains' },
  { id: 'fort-hall', name: 'Fort Hall', kind: 'fort', environment: 'mountains' },
  { id: 'snake-river', name: 'Snake River Crossing', kind: 'river', riverDepth: 5.0, riverWidth: 1000, ferry: false, environment: 'river-valley' },
  { id: 'salmon-falls', name: 'Salmon Falls', kind: 'natural', environment: 'desert' },
  { id: 'three-island', name: 'Three Island Crossing', kind: 'river', riverDepth: 4.0, riverWidth: 800, ferry: false, environment: 'desert' },
  { id: 'fort-boise', name: 'Fort Boise', kind: 'fort', environment: 'desert' },
  { id: 'blue-mountains', name: 'Blue Mountains', kind: 'natural', environment: 'mountains' },
  { id: 'fort-walla-walla', name: 'Fort Walla Walla', kind: 'fort', environment: 'forest' },
  { id: 'the-dalles', name: 'The Dalles', kind: 'natural', environment: 'forest' },
  { id: 'raft-columbia', name: 'Columbia River Rapids', kind: 'river', riverDepth: 6.0, riverWidth: 1500, ferry: false, environment: 'river-valley' },
  { id: 'barlow-road', name: 'Barlow Toll Road', kind: 'natural', environment: 'mountains' },
  { id: 'fort-vancouver', name: 'Fort Vancouver', kind: 'fort', environment: 'river-valley' },
  { id: 'oregon-city', name: 'Oregon City', kind: 'town', environment: 'forest' },
  { id: 'willamette', name: 'Willamette Valley', kind: 'destination', environment: 'forest' },
];

const EDGE_DEFS: EdgeDef[] = [
  { id: 'independence->kansas-river', from: 'independence', to: 'kansas-river', miles: 102, environment: 'plains' },
  { id: 'kansas-river->big-blue', from: 'kansas-river', to: 'big-blue', miles: 83, environment: 'plains' },
  { id: 'big-blue->fort-kearney', from: 'big-blue', to: 'fort-kearney', miles: 119, environment: 'plains' },
  { id: 'fort-kearney->chimney-rock', from: 'fort-kearney', to: 'chimney-rock', miles: 250, environment: 'plains' },
  { id: 'chimney-rock->fort-laramie', from: 'chimney-rock', to: 'fort-laramie', miles: 86, environment: 'plains' },
  { id: 'fort-laramie->register-cliff', from: 'fort-laramie', to: 'register-cliff', miles: 42, environment: 'plains' },
  { id: 'register-cliff->independence-rock', from: 'register-cliff', to: 'independence-rock', miles: 148, environment: 'plains' },
  { id: 'independence-rock->devils-gate', from: 'independence-rock', to: 'devils-gate', miles: 55, environment: 'plains' },
  { id: 'devils-gate->south-pass', from: 'devils-gate', to: 'south-pass', miles: 102, environment: 'mountains' },

  // Junction 1: South Pass — Greenwood Cutoff vs Fort Bridger detour
  { id: 'south-pass->green-river', from: 'south-pass', to: 'green-river', miles: 57, environment: 'mountains', difficulty: 'hard', description: 'Greenwood Cutoff — straight across, fast but dry.' },
  { id: 'south-pass->fort-bridger', from: 'south-pass', to: 'fort-bridger', miles: 85, environment: 'mountains', difficulty: 'easy', description: 'Detour to Fort Bridger — supplies and rest.' },
  { id: 'green-river->soda-springs', from: 'green-river', to: 'soda-springs', miles: 111, environment: 'mountains' },
  { id: 'fort-bridger->soda-springs', from: 'fort-bridger', to: 'soda-springs', miles: 125, environment: 'mountains' },

  { id: 'soda-springs->fort-hall', from: 'soda-springs', to: 'fort-hall', miles: 117, environment: 'mountains' },
  { id: 'fort-hall->snake-river', from: 'fort-hall', to: 'snake-river', miles: 178, environment: 'river-valley' },
  { id: 'snake-river->salmon-falls', from: 'snake-river', to: 'salmon-falls', miles: 70, environment: 'desert' },
  { id: 'salmon-falls->three-island', from: 'salmon-falls', to: 'three-island', miles: 55, environment: 'desert' },
  { id: 'three-island->fort-boise', from: 'three-island', to: 'fort-boise', miles: 75, environment: 'desert' },
  { id: 'fort-boise->blue-mountains', from: 'fort-boise', to: 'blue-mountains', miles: 165, environment: 'mountains' },
  { id: 'blue-mountains->fort-walla-walla', from: 'blue-mountains', to: 'fort-walla-walla', miles: 80, environment: 'forest' },
  { id: 'fort-walla-walla->the-dalles', from: 'fort-walla-walla', to: 'the-dalles', miles: 130, environment: 'forest' },

  // Junction 2: The Dalles — raft Columbia vs Barlow Toll Road
  { id: 'the-dalles->raft-columbia', from: 'the-dalles', to: 'raft-columbia', miles: 110, environment: 'river-valley', difficulty: 'hard', description: 'Raft the Columbia — fast but the rapids are deadly.' },
  { id: 'the-dalles->barlow-road', from: 'the-dalles', to: 'barlow-road', miles: 100, environment: 'mountains', difficulty: 'normal', description: 'Barlow Toll Road — slow climb past Mt. Hood. $5 toll.' },
  { id: 'raft-columbia->fort-vancouver', from: 'raft-columbia', to: 'fort-vancouver', miles: 50, environment: 'river-valley' },
  { id: 'barlow-road->oregon-city', from: 'barlow-road', to: 'oregon-city', miles: 80, environment: 'forest' },
  { id: 'fort-vancouver->oregon-city', from: 'fort-vancouver', to: 'oregon-city', miles: 40, environment: 'river-valley' },

  { id: 'oregon-city->willamette', from: 'oregon-city', to: 'willamette', miles: 25, environment: 'forest' },
];

function buildDefaultRoute(): RouteGraph {
  const nodes: Landmark[] = NODE_DEFS;
  const edges: RouteEdge[] = EDGE_DEFS.map((e) => ({
    id: e.id,
    fromNodeId: e.from,
    toNodeId: e.to,
    miles: e.miles,
    environment: e.environment,
    difficulty: e.difficulty,
    description: e.description,
  }));
  return buildRouteGraph(nodes, edges, 'independence', 'willamette');
}

export const DEFAULT_ROUTE: RouteGraph = buildDefaultRoute();

export const LANDMARKS: readonly Landmark[] = NODE_DEFS;

export function getLandmark(id: string): Landmark {
  return getNode(DEFAULT_ROUTE, id);
}

export function currentLandmark(state: GameState): Landmark {
  return currentNode(DEFAULT_ROUTE, state);
}

export function nextLandmark(state: GameState): Landmark | undefined {
  return nextNode(DEFAULT_ROUTE, state);
}

export function milesToNextLandmark(state: GameState): number {
  return milesToNextNode(DEFAULT_ROUTE, state);
}
