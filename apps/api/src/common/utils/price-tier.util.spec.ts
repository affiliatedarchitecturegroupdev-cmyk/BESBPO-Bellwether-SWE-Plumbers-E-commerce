import { resolveBestTier } from './price-tier.util';

describe('resolveBestTier', () => {
  it('returns null when no tiers qualify', () => {
    const result = resolveBestTier([{ minQuantity: 10, discountPercent: 5 }], 5);
    expect(result).toBeNull();
  });

  it('returns the single qualifying tier', () => {
    const result = resolveBestTier([{ minQuantity: 10, discountPercent: 5 }], 10);
    expect(result?.discountPercent).toBe(5);
  });

  it('returns the HIGHEST-qualifying tier, not the first match, regardless of input order', () => {
    const tiers = [
      { minQuantity: 10, discountPercent: 5 },
      { minQuantity: 50, discountPercent: 12 },
      { minQuantity: 25, discountPercent: 8 },
    ];
    // 47 qualifies for both the 10 and 25 tiers, but not 50 — should get
    // the 25 tier's discount (8%), not the first one in array order (5%).
    const result = resolveBestTier(tiers, 47);
    expect(result?.minQuantity).toBe(25);
    expect(result?.discountPercent).toBe(8);
  });

  it('qualifies for the highest tier when quantity exceeds every threshold', () => {
    const tiers = [
      { minQuantity: 10, discountPercent: 5 },
      { minQuantity: 50, discountPercent: 12 },
    ];
    const result = resolveBestTier(tiers, 100);
    expect(result?.minQuantity).toBe(50);
  });

  it('treats minQuantity as an inclusive lower bound — exactly at the threshold qualifies', () => {
    const result = resolveBestTier([{ minQuantity: 10, discountPercent: 5 }], 10);
    expect(result).not.toBeNull();
  });

  it('returns null for an empty tier list', () => {
    expect(resolveBestTier([], 100)).toBeNull();
  });
});
