import type { Landmark } from './types';

export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence', name: 'Independence', kind: 'town', milesFromStart: 0 },
  { id: 'kansas-river', name: 'Kansas River Crossing', kind: 'river', milesFromStart: 102, riverDepth: 2.5, riverWidth: 620, ferry: false },
  { id: 'big-blue', name: 'Big Blue River Crossing', kind: 'river', milesFromStart: 185, riverDepth: 3.0, riverWidth: 530, ferry: false },
  { id: 'fort-kearney', name: 'Fort Kearney', kind: 'fort', milesFromStart: 304 },
  { id: 'chimney-rock', name: 'Chimney Rock', kind: 'natural', milesFromStart: 554 },
  { id: 'fort-laramie', name: 'Fort Laramie', kind: 'fort', milesFromStart: 640 },
  { id: 'independence-rock', name: 'Independence Rock', kind: 'natural', milesFromStart: 830 },
  { id: 'south-pass', name: 'South Pass', kind: 'natural', milesFromStart: 932 },
  { id: 'green-river', name: 'Green River Crossing', kind: 'river', milesFromStart: 989, riverDepth: 4.5, riverWidth: 400, ferry: true },
  { id: 'soda-springs', name: 'Soda Springs', kind: 'natural', milesFromStart: 1100 },
  { id: 'fort-hall', name: 'Fort Hall', kind: 'fort', milesFromStart: 1217 },
  { id: 'snake-river', name: 'Snake River Crossing', kind: 'river', milesFromStart: 1395, riverDepth: 5.0, riverWidth: 1000, ferry: false },
  { id: 'fort-boise', name: 'Fort Boise', kind: 'fort', milesFromStart: 1455 },
  { id: 'blue-mountains', name: 'Blue Mountains', kind: 'natural', milesFromStart: 1620 },
  { id: 'fort-walla-walla', name: 'Fort Walla Walla', kind: 'fort', milesFromStart: 1700 },
  { id: 'the-dalles', name: 'The Dalles', kind: 'natural', milesFromStart: 1830 },
  { id: 'willamette', name: 'Willamette Valley', kind: 'destination', milesFromStart: 2040 },
] as const;

export function nextLandmark(index: number): Landmark | undefined {
  return LANDMARKS[index + 1];
}

export function currentLandmark(index: number): Landmark {
  return LANDMARKS[index];
}

export function milesToNextLandmark(index: number, milesTraveled: number): number {
  const next = LANDMARKS[index + 1];
  if (!next) return 0;
  return next.milesFromStart - milesTraveled;
}
