import { RecurringFrequency } from '@prisma/client';

// A standalone pure function, not a service method — same reasoning as
// common/utils/price-tier.util.ts's resolveBestTier: this has no
// dependencies at all, so wrapping it in an injectable class would just
// be an unnecessary layer. Used both when a template is first created
// (computing its initial nextRunAt) and after each automatic run
// (computing the next one from whichever date the run actually
// happened, not from the previously-scheduled date — see
// RecurringOrdersService's own comment on why that distinction matters
// if a run is ever delayed).
export function computeNextRunAt(frequency: RecurringFrequency, from: Date): Date {
  const next = new Date(from);
  if (frequency === RecurringFrequency.WEEKLY) {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}
