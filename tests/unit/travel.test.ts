import { describe, it, expect } from 'vitest';
import {
  dailyTravel,
  PACE_MILES,
  RATION_FOOD_PER_DAY,
  setPace,
  setRations,
  totalDistance,
  rest,
  clamp,
} from '../../src/core/travel';
import { createInitialState } from '../../src/core/state';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

describe('travel', () => {
  it('PACE_MILES values', () => {
    expect(PACE_MILES.steady).toBe(14);
    expect(PACE_MILES.strenuous).toBe(18);
    expect(PACE_MILES.grueling).toBe(22);
  });

  it('RATION_FOOD_PER_DAY values', () => {
    expect(RATION_FOOD_PER_DAY.filling).toBe(3);
    expect(RATION_FOOD_PER_DAY.meager).toBe(2);
    expect(RATION_FOOD_PER_DAY.bare).toBe(1);
  });

  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('setPace and setRations mutate state', () => {
    const s = createInitialState(opts());
    setPace(s, 'grueling');
    setRations(s, 'bare');
    expect(s.pace).toBe('grueling');
    expect(s.rations).toBe('bare');
  });

  it('totalDistance equals last landmark mileage', () => {
    expect(totalDistance()).toBe(2040);
  });

  it('dailyTravel advances mileage and consumes food', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 100;
    const r = dailyTravel(s);
    expect(r.milesAdvanced).toBe(14);
    expect(r.foodEaten).toBe(15); // 5 alive × 3
    expect(s.inventory.food).toBe(85);
  });

  it('weak ox train slows travel', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 2;
    s.inventory.food = 100;
    const r = dailyTravel(s);
    expect(r.milesAdvanced).toBeLessThan(14);
  });

  it('hot weather slows travel', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 100;
    s.weather = 'very hot';
    const r = dailyTravel(s);
    expect(r.milesAdvanced).toBeLessThan(14);
  });

  it('starvation damages health', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 0;
    const r = dailyTravel(s);
    expect(s.party[0].health).toBeLessThan(100);
    expect(r.notes.join(' ')).toContain('run out of food');
  });

  it('reaching a landmark advances landmarkIndex', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 1000;
    s.milesTraveled = 100;
    const r = dailyTravel(s);
    expect(r.reachedLandmark).toBe(true);
    expect(s.landmarkIndex).toBe(1);
  });

  it('reaching destination triggers victory', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 1000;
    s.landmarkIndex = 15;
    s.milesTraveled = 2030;
    dailyTravel(s);
    expect(s.victory).toBe(true);
    expect(s.ended).toBe(true);
  });

  it('rest restores health and consumes food', () => {
    const s = createInitialState(opts());
    s.inventory.food = 100;
    s.party.forEach((m) => (m.health = 50));
    rest(s, 3);
    expect(s.party[0].health).toBeGreaterThan(50);
    expect(s.inventory.food).toBeLessThan(100);
  });

  it('rest with no food does not crash', () => {
    const s = createInitialState(opts());
    s.inventory.food = 0;
    rest(s, 2);
    expect(s.inventory.food).toBe(0);
  });

  it('strenuous and grueling pace damage health', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 1000;
    s.pace = 'grueling';
    s.party.forEach((m) => (m.health = 100));
    dailyTravel(s);
    expect(s.party[0].health).toBeLessThan(100);
  });

  it('filling rations restore health', () => {
    const s = createInitialState(opts());
    s.inventory.oxen = 6;
    s.inventory.food = 1000;
    s.party.forEach((m) => (m.health = 50));
    dailyTravel(s);
    expect(s.party[0].health).toBeGreaterThan(50);
  });
});
