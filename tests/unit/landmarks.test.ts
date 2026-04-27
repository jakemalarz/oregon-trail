import { describe, it, expect } from 'vitest';
import { LANDMARKS, currentLandmark, nextLandmark, milesToNextLandmark } from '../../src/core/landmarks';

describe('landmarks', () => {
  it('has 17 landmarks starting at Independence and ending at Willamette', () => {
    expect(LANDMARKS).toHaveLength(17);
    expect(LANDMARKS[0].name).toBe('Independence');
    expect(LANDMARKS[LANDMARKS.length - 1].name).toBe('Willamette Valley');
    expect(LANDMARKS[LANDMARKS.length - 1].kind).toBe('destination');
  });

  it('milesFromStart is monotonically increasing', () => {
    for (let i = 1; i < LANDMARKS.length; i++) {
      expect(LANDMARKS[i].milesFromStart).toBeGreaterThan(LANDMARKS[i - 1].milesFromStart);
    }
  });

  it('nextLandmark returns following landmark or undefined', () => {
    expect(nextLandmark(0)?.name).toBe('Kansas River Crossing');
    expect(nextLandmark(LANDMARKS.length - 1)).toBeUndefined();
  });

  it('currentLandmark returns landmark at index', () => {
    expect(currentLandmark(0).name).toBe('Independence');
    expect(currentLandmark(3).name).toBe('Fort Kearney');
  });

  it('milesToNextLandmark computes remaining distance', () => {
    expect(milesToNextLandmark(0, 0)).toBe(102);
    expect(milesToNextLandmark(0, 50)).toBe(52);
    expect(milesToNextLandmark(LANDMARKS.length - 1, 2040)).toBe(0);
  });
});
