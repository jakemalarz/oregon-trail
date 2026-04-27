import type { Month, Weather } from './types';

const MONTHS: Month[] = ['March', 'April', 'May', 'June', 'July'];
const DAYS_PER_MONTH: Record<string, number> = {
  March: 31,
  April: 30,
  May: 31,
  June: 30,
  July: 31,
  August: 31,
  September: 30,
  October: 31,
  November: 30,
  December: 31,
};
const ALL_MONTHS = [
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function isValidStartMonth(m: string): m is Month {
  return MONTHS.includes(m as Month);
}

export function advanceDays(
  date: { month: string; day: number; year: number },
  days: number,
): { month: string; day: number; year: number } {
  let { month, day, year } = date;
  let remaining = days;
  while (remaining > 0) {
    const inMonth = DAYS_PER_MONTH[month] ?? 30;
    const space = inMonth - day;
    if (remaining <= space) {
      day += remaining;
      remaining = 0;
    } else {
      remaining -= space + 1;
      day = 1;
      const idx = ALL_MONTHS.indexOf(month as (typeof ALL_MONTHS)[number]);
      const nextIdx = idx + 1;
      if (nextIdx >= ALL_MONTHS.length) {
        month = 'March';
        year += 1;
      } else {
        month = ALL_MONTHS[nextIdx];
      }
    }
  }
  return { month, day, year };
}

export function weatherFor(month: string): Weather {
  switch (month) {
    case 'March':
      return 'cool';
    case 'April':
      return 'warm';
    case 'May':
      return 'warm';
    case 'June':
      return 'hot';
    case 'July':
      return 'very hot';
    case 'August':
      return 'hot';
    case 'September':
      return 'cool';
    case 'October':
      return 'cold';
    case 'November':
      return 'very cold';
    case 'December':
      return 'very cold';
    default:
      return 'warm';
  }
}

export function formatDate(date: { month: string; day: number; year: number }): string {
  return `${date.month} ${date.day}, ${date.year}`;
}
