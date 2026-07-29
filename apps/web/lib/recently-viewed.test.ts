import { getRecentlyViewed, recordProductView } from './recently-viewed';

describe('recently-viewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('records a viewed product at the front of the list', () => {
    recordProductView('product-a');
    expect(getRecentlyViewed()).toEqual(['product-a']);
  });

  it('puts the most recently viewed product first', () => {
    recordProductView('product-a');
    recordProductView('product-b');
    expect(getRecentlyViewed()).toEqual(['product-b', 'product-a']);
  });

  it('moves an already-viewed product to the front instead of duplicating it', () => {
    recordProductView('product-a');
    recordProductView('product-b');
    recordProductView('product-a');

    expect(getRecentlyViewed()).toEqual(['product-a', 'product-b']);
  });

  it('caps the list at 10 items, dropping the oldest', () => {
    for (let i = 1; i <= 11; i++) {
      recordProductView(`product-${i}`);
    }
    const result = getRecentlyViewed();
    expect(result).toHaveLength(10);
    expect(result[0]).toBe('product-11');
    expect(result).not.toContain('product-1');
  });
});
