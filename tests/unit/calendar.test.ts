import { describe, it, expect } from 'vitest';
import { advanceDays, weatherFor, formatDate, isValidStartMonth } from '../../src/core/calendar';

describe('calendar', () => {
  it('advanceDays within the same month', () => {
    const d = advanceDays({ month: 'March', day: 1, year: 1848 }, 5);
    expect(d).toEqual({ month: 'March', day: 6, year: 1848 });
  });

  it('advanceDays rolls into the next month', () => {
    const d = advanceDays({ month: 'March', day: 30, year: 1848 }, 5);
    expect(d.month).toBe('April');
    expect(d.year).toBe(1848);
  });

  it('advanceDays rolls year forward', () => {
    const d = advanceDays({ month: 'December', day: 30, year: 1848 }, 5);
    expect(d.year).toBe(1849);
    expect(d.month).toBe('March');
  });

  it('advanceDays handles 0 days', () => {
    const d = advanceDays({ month: 'March', day: 1, year: 1848 }, 0);
    expect(d).toEqual({ month: 'March', day: 1, year: 1848 });
  });

  it('advanceDays many months', () => {
    const d = advanceDays({ month: 'March', day: 1, year: 1848 }, 100);
    expect(d.year).toBe(1848);
    // March(31)+April(30)+May(31)+June(8) = 100 days from Mar 1
    expect(d.month).toBe('June');
  });

  it('weatherFor returns expected values', () => {
    expect(weatherFor('March')).toBe('cool');
    expect(weatherFor('April')).toBe('warm');
    expect(weatherFor('May')).toBe('warm');
    expect(weatherFor('June')).toBe('hot');
    expect(weatherFor('July')).toBe('very hot');
    expect(weatherFor('August')).toBe('hot');
    expect(weatherFor('September')).toBe('cool');
    expect(weatherFor('October')).toBe('cold');
    expect(weatherFor('November')).toBe('very cold');
    expect(weatherFor('December')).toBe('very cold');
    expect(weatherFor('Unknown')).toBe('warm');
  });

  it('formatDate renders correctly', () => {
    expect(formatDate({ month: 'May', day: 14, year: 1848 })).toBe('May 14, 1848');
  });

  it('isValidStartMonth allows March-July', () => {
    expect(isValidStartMonth('March')).toBe(true);
    expect(isValidStartMonth('July')).toBe(true);
    expect(isValidStartMonth('August')).toBe(false);
    expect(isValidStartMonth('Foo')).toBe(false);
  });
});
