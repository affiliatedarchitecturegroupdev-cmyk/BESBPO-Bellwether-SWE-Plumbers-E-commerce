import {
  clearCompareList,
  getCompareList,
  isInCompareList,
  removeFromCompareList,
  toggleCompare,
} from './compare-list';

describe('compare-list', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(getCompareList()).toEqual([]);
  });

  it('adds a product on first toggle', () => {
    const result = toggleCompare('prod-1');
    expect(result.ok).toBe(true);
    expect(getCompareList()).toEqual(['prod-1']);
  });

  it('removes a product on second toggle of the same ID', () => {
    toggleCompare('prod-1');
    const result = toggleCompare('prod-1');
    expect(result.ok).toBe(true);
    expect(getCompareList()).toEqual([]);
  });

  it('rejects adding a 5th product with a clear reason, leaving the existing 4 untouched', () => {
    toggleCompare('prod-1');
    toggleCompare('prod-2');
    toggleCompare('prod-3');
    toggleCompare('prod-4');

    const result = toggleCompare('prod-5');

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('up to 4');
    expect(getCompareList()).toEqual(['prod-1', 'prod-2', 'prod-3', 'prod-4']);
  });

  it('isInCompareList reflects the current list accurately', () => {
    toggleCompare('prod-1');
    expect(isInCompareList('prod-1')).toBe(true);
    expect(isInCompareList('prod-2')).toBe(false);
  });

  it('removeFromCompareList removes only the specified product', () => {
    toggleCompare('prod-1');
    toggleCompare('prod-2');

    removeFromCompareList('prod-1');

    expect(getCompareList()).toEqual(['prod-2']);
  });

  it('clearCompareList empties the whole list', () => {
    toggleCompare('prod-1');
    toggleCompare('prod-2');

    clearCompareList();

    expect(getCompareList()).toEqual([]);
  });

  it('dispatches a same-tab custom event on every change, since the native storage event only fires in other tabs', () => {
    const listener = jest.fn();
    window.addEventListener('compare-list-changed', listener);

    toggleCompare('prod-1');

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('compare-list-changed', listener);
  });
});
