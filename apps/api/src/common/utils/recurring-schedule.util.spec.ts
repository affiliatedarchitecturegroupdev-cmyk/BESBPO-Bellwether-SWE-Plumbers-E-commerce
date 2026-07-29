import { RecurringFrequency } from '@prisma/client';
import { computeNextRunAt } from './recurring-schedule.util';

describe('computeNextRunAt', () => {
  it('adds exactly 7 days for WEEKLY', () => {
    const from = new Date('2026-01-01T10:00:00Z');
    const next = computeNextRunAt(RecurringFrequency.WEEKLY, from);
    expect(next.toISOString()).toBe('2026-01-08T10:00:00.000Z');
  });

  it('adds exactly 1 month for MONTHLY', () => {
    const from = new Date('2026-01-15T10:00:00Z');
    const next = computeNextRunAt(RecurringFrequency.MONTHLY, from);
    expect(next.getUTCMonth()).toBe(1); // February (0-indexed)
    expect(next.getUTCDate()).toBe(15);
  });

  it('does not mutate the input date', () => {
    const from = new Date('2026-01-01T10:00:00Z');
    const originalTime = from.getTime();
    computeNextRunAt(RecurringFrequency.MONTHLY, from);
    expect(from.getTime()).toBe(originalTime);
  });

  it('correctly rolls over into the next year for a MONTHLY run starting in December', () => {
    const from = new Date('2026-12-15T10:00:00Z');
    const next = computeNextRunAt(RecurringFrequency.MONTHLY, from);
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(0); // January
  });
});
