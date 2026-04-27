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

export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  milesFromStart: number;
  riverDepth?: number;
  riverWidth?: number;
  ferry?: boolean;
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
  | 'trail'
  | 'landmark'
  | 'river'
  | 'hunt'
  | 'trade'
  | 'rest'
  | 'gameOver'
  | 'victory'
  | 'topTen';

export interface GameState {
  party: PartyMember[];
  profession: Profession;
  money: number;
  inventory: Inventory;
  wagon: Wagon;
  pace: Pace;
  rations: Rations;
  milesTraveled: number;
  landmarkIndex: number;
  date: { month: Month; day: number; year: number };
  weather: Weather;
  log: string[];
  rngSeed: number;
  ended: boolean;
  victory: boolean;
}

export interface ScoreEntry {
  name: string;
  score: number;
  profession: Profession;
  date: string;
  arrived: boolean;
}
