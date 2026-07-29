import { isOnSale } from './is-on-sale';

describe('isOnSale', () => {
  it('is false when salePrice is null, regardless of saleEndsAt', () => {
    expect(isOnSale({ salePrice: null, saleEndsAt: null })).toBe(false);
    expect(isOnSale({ salePrice: null, saleEndsAt: '2099-01-01T00:00:00.000Z' })).toBe(false);
  });

  it('is true when salePrice is set and saleEndsAt is null — no scheduled end', () => {
    expect(isOnSale({ salePrice: '100.00', saleEndsAt: null })).toBe(true);
  });

  it('is true when salePrice is set and saleEndsAt is still in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(isOnSale({ salePrice: '100.00', saleEndsAt: future })).toBe(true);
  });

  it('is false when salePrice is set but saleEndsAt has already passed', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(isOnSale({ salePrice: '100.00', saleEndsAt: past })).toBe(false);
  });
});
