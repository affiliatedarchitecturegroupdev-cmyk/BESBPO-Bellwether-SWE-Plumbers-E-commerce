// The one place "which tier applies for this quantity" is decided —
// called from CartService.price() for every line, so there's no second,
// drifting copy of this logic anywhere (checkout doesn't recompute it
// separately; it prices the cart the same way a plain browse would). A
// standalone pure function, not a service method, since it has no
// dependencies at all — same shape as round2/VAT_RATE in money.util.ts.
export interface PriceTierLike {
  minQuantity: number;
  discountPercent: number;
}

// The HIGHEST-qualifying tier wins, not the first match in whatever
// order tiers happen to be supplied — quantity 47 against tiers at 10
// and 25 should get the 25 tier's discount, not the 10 tier's.
export function resolveBestTier<T extends PriceTierLike>(tiers: T[], quantity: number): T | null {
  const qualifying = tiers.filter((t) => quantity >= t.minQuantity);
  if (qualifying.length === 0) return null;
  return qualifying.reduce((best, t) => (t.minQuantity > best.minQuantity ? t : best));
}
