import type { GameState, Profession, Month, PartyMember } from './types';
import { DEFAULT_ROUTE } from './landmarks';

export const PROFESSION_STARTING_MONEY: Record<Profession, number> = {
  banker: 1600,
  carpenter: 800,
  farmer: 400,
};

export const PROFESSION_MULTIPLIER: Record<Profession, number> = {
  banker: 1,
  carpenter: 2,
  farmer: 3,
};

export function makePartyMember(name: string): PartyMember {
  return { name, alive: true, health: 100, illness: 'none' };
}

export interface NewGameOptions {
  profession: Profession;
  partyNames: [string, string, string, string, string];
  departureMonth: Month;
  seed: number;
}

export function createInitialState(opts: NewGameOptions): GameState {
  return {
    party: opts.partyNames.map(makePartyMember),
    profession: opts.profession,
    money: PROFESSION_STARTING_MONEY[opts.profession],
    inventory: { oxen: 0, food: 0, clothing: 0, ammunition: 0, wheels: 0, axles: 0, tongues: 0 },
    wagon: { wheels: 2, axles: 1, tongues: 1, capacityLbs: 2000 },
    pace: 'steady',
    rations: 'filling',
    milesTraveled: 0,
    currentNodeId: DEFAULT_ROUTE.startNodeId,
    currentEdgeId: null,
    milesIntoEdge: 0,
    visitedNodeIds: [DEFAULT_ROUTE.startNodeId],
    pendingChoice: null,
    date: { month: opts.departureMonth, day: 1, year: 1848 },
    weather: 'warm',
    log: ['You set out from Independence, Missouri.'],
    rngSeed: opts.seed,
    ended: false,
    victory: false,
    loan: null,
    flags: {},
    rumors: [],
    journal: [
      {
        date: { month: opts.departureMonth, day: 1, year: 1848 },
        kind: 'depart',
        nodeId: DEFAULT_ROUTE.startNodeId,
        text: 'Set out from Independence, Missouri.',
      },
    ],
    epitaph: null,
  };
}

export function aliveCount(state: GameState): number {
  return state.party.filter((p) => p.alive).length;
}

export function aliveMembers(state: GameState): PartyMember[] {
  return state.party.filter((p) => p.alive);
}
