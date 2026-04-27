import type { GameState, Pace, Rations } from './types';
import { advanceDays, weatherFor } from './calendar';
import { LANDMARKS, currentLandmark, milesToNextLandmark } from './landmarks';
import { aliveCount, aliveMembers } from './state';

export const PACE_MILES: Record<Pace, number> = {
  steady: 14,
  strenuous: 18,
  grueling: 22,
};

export const PACE_HEALTH_DELTA: Record<Pace, number> = {
  steady: 0,
  strenuous: -1,
  grueling: -3,
};

export const RATION_FOOD_PER_DAY: Record<Rations, number> = {
  filling: 3,
  meager: 2,
  bare: 1,
};

export const RATION_HEALTH_DELTA: Record<Rations, number> = {
  filling: 1,
  meager: 0,
  bare: -1,
};

export interface DayResult {
  milesAdvanced: number;
  foodEaten: number;
  reachedLandmark: boolean;
  notes: string[];
}

export function dailyTravel(state: GameState): DayResult {
  const notes: string[] = [];
  let miles = PACE_MILES[state.pace];
  if (state.inventory.oxen < 4) miles = Math.floor(miles * 0.6);
  if (state.weather === 'very hot' || state.weather === 'very cold') miles = Math.floor(miles * 0.8);

  const remaining = milesToNextLandmark(state.landmarkIndex, state.milesTraveled);
  let reachedLandmark = false;
  if (miles >= remaining && remaining > 0) {
    miles = remaining;
    reachedLandmark = true;
  }

  state.milesTraveled += miles;

  const aliveN = aliveCount(state);
  const foodNeeded = RATION_FOOD_PER_DAY[state.rations] * aliveN;
  let foodEaten = foodNeeded;
  if (state.inventory.food < foodNeeded) {
    foodEaten = state.inventory.food;
    state.inventory.food = 0;
    notes.push('You have run out of food!');
    for (const m of aliveMembers(state)) m.health -= 5;
  } else {
    state.inventory.food -= foodNeeded;
  }

  const healthDelta = PACE_HEALTH_DELTA[state.pace] + RATION_HEALTH_DELTA[state.rations];
  for (const m of aliveMembers(state)) {
    m.health = clamp(m.health + healthDelta, 0, 100);
  }

  state.date = advanceDays(state.date, 1) as typeof state.date;
  state.weather = weatherFor(state.date.month);

  if (reachedLandmark) {
    state.landmarkIndex += 1;
    const lm = currentLandmark(state.landmarkIndex);
    notes.push(`You have reached ${lm.name}.`);
    if (lm.kind === 'destination') {
      state.victory = true;
      state.ended = true;
    }
  }

  return { milesAdvanced: miles, foodEaten, reachedLandmark, notes };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function totalDistance(): number {
  return LANDMARKS[LANDMARKS.length - 1].milesFromStart;
}

export function setPace(state: GameState, pace: Pace): void {
  state.pace = pace;
}

export function setRations(state: GameState, rations: Rations): void {
  state.rations = rations;
}

export function rest(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    const aliveN = aliveCount(state);
    const food = RATION_FOOD_PER_DAY[state.rations] * aliveN;
    if (state.inventory.food >= food) state.inventory.food -= food;
    else state.inventory.food = 0;
    for (const m of aliveMembers(state)) m.health = clamp(m.health + 5, 0, 100);
    state.date = advanceDays(state.date, 1) as typeof state.date;
  }
  state.weather = weatherFor(state.date.month);
}
