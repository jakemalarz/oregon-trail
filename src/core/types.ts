export type Profession = 'banker' | 'carpenter' | 'farmer';

export type Pace = 'steady' | 'strenuous' | 'grueling';

export type Rations = 'filling' | 'meager' | 'bare';

export type HealthStatus = 'good' | 'fair' | 'poor' | 'very poor';

export type Illness =
  | 'exhaustion'
  | 'typhoid'
  | 'cholera'
  | 'measles'
  | 'dysentery'
  | 'fever'
  | 'broken arm'
  | 'broken leg'
  | 'snake bite'
  | 'none';

export interface PartyMember {
  name: string;
  alive: boolean;
  health: number;
  illness: Illness;
}

export type Month =
  | 'March'
  | 'April'
  | 'May'
  | 'June'
  | 'July';

export interface Inventory {
  oxen: number;
  food: number;
  clothing: number;
  ammunition: number;
  wheels: number;
  axles: number;
  tongues: number;
}

export interface Wagon {
  wheels: number;
  axles: number;
  tongues: number;
  capacityLbs: number;
}

export type LandmarkKind =
  | 'town'
  | 'fort'
  | 'river'
  | 'natural'
  | 'destination';

export type Environment =
  | 'plains'
  | 'forest'
  | 'mountains'
  | 'desert'
  | 'river-valley';

export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  riverDepth?: number;
  riverWidth?: number;
  ferry?: boolean;
  environment?: Environment;
  imageId?: string;
  guidebookId?: string;
}

export interface RouteEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  miles: number;
  environment: Environment;
  difficulty?: 'easy' | 'normal' | 'hard';
  description?: string;
}

export interface RouteGraph {
  nodes: Record<string, Landmark>;
  edges: Record<string, RouteEdge>;
  outgoing: Record<string, RouteEdge[]>;
  startNodeId: string;
  destinationNodeId: string;
}

export type Weather =
  | 'cool'
  | 'warm'
  | 'hot'
  | 'very hot'
  | 'cold'
  | 'very cold';

export type ScreenName =
  | 'title'
  | 'profession'
  | 'partyNames'
  | 'departure'
  | 'store'
  | 'bank'
  | 'trail'
  | 'landmark'
  | 'river'
  | 'hunt'
  | 'trade'
  | 'rest'
  | 'gameOver'
  | 'victory'
  | 'topTen'
  | 'journal'
  | 'guidebook'
  | 'tombstone';

export type JournalKind = 'arrived' | 'event' | 'death' | 'choice' | 'note' | 'depart' | 'hunt' | 'rest' | 'river';

export interface JournalEntry {
  date: { month: Month; day: number; year: number };
  kind: JournalKind;
  nodeId?: string;
  text: string;
}

export type ItemKey = 'oxen' | 'food' | 'clothing' | 'ammunition' | 'wheels' | 'axles' | 'tongues';

export type DialogueEffect =
  | { kind: 'addItem'; item: ItemKey; qty: number }
  | { kind: 'removeItem'; item: ItemKey; qty: number }
  | { kind: 'addMoney'; amount: number }
  | { kind: 'removeMoney'; amount: number }
  | { kind: 'flag'; key: string; value: boolean }
  | { kind: 'log'; text: string }
  | { kind: 'health'; delta: number; targetIndex?: number }
  | { kind: 'rumor'; key: string };

export interface DialogueChoice {
  id: string;
  text: string;
  next?: string;
  effects?: DialogueEffect[];
  visibleIf?: (state: GameState) => boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string | ((state: GameState) => string);
  choices: DialogueChoice[];
}

export interface DialogueGraph {
  id: string;
  portraitId?: string;
  nodes: Record<string, DialogueNode>;
  startNodeId: string;
}

export interface Loan {
  principal: number;
  rateAnnual: number;
  takenOn: { month: Month; day: number; year: number };
  daysAccrued: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
}

export interface GameState {
  party: PartyMember[];
  profession: Profession;
  money: number;
  inventory: Inventory;
  wagon: Wagon;
  pace: Pace;
  rations: Rations;
  milesTraveled: number;
  currentNodeId: string;
  currentEdgeId: string | null;
  milesIntoEdge: number;
  visitedNodeIds: string[];
  pendingChoice: string | null;
  date: { month: Month; day: number; year: number };
  weather: Weather;
  log: string[];
  rngSeed: number;
  ended: boolean;
  victory: boolean;
  loan: Loan | null;
  flags: Record<string, boolean>;
  rumors: string[];
  journal: JournalEntry[];
  epitaph: string | null;
}

export interface ScoreEntry {
  name: string;
  score: number;
  profession: Profession;
  date: string;
  arrived: boolean;
}
