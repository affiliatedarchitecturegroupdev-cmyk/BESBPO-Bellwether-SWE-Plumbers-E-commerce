const STORAGE_KEY = 'bswe-compare-list';
const MAX_ITEMS = 4;

// A plain array of product SLUGS in localStorage (not IDs — there's no
// existing "get a product by ID" endpoint, only by slug, and adding one
// solely for this feature wasn't worth it when the slug already
// round-trips correctly through GET /v1/products/:slug, the same
// endpoint the PDP itself already uses). No server-side storage at all,
// since a comparison list is genuinely per-browser, transient scratch
// state, not something that needs an account or needs to persist across
// devices. Capped at 4: comparison tables become unreadable well before
// that on a real product with this many meaningful fields (price,
// brand, category, stock, rating).
export function getCompareList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setCompareList(slugs: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  // Same-tab listeners (CompareButton, CompareBar) don't receive the
  // native 'storage' event — that only fires in OTHER tabs/windows for
  // the same origin. Dispatching a custom event lets every instance of
  // those components in THIS tab stay in sync with each other without
  // prop-drilling a list down through the whole product grid.
  window.dispatchEvent(new Event('compare-list-changed'));
}

export function isInCompareList(slug: string): boolean {
  return getCompareList().includes(slug);
}

export function toggleCompare(slug: string): { ok: boolean; reason?: string } {
  const current = getCompareList();
  if (current.includes(slug)) {
    setCompareList(current.filter((s) => s !== slug));
    return { ok: true };
  }
  if (current.length >= MAX_ITEMS) {
    return { ok: false, reason: `You can compare up to ${MAX_ITEMS} products at a time.` };
  }
  setCompareList([...current, slug]);
  return { ok: true };
}

export function removeFromCompareList(slug: string): void {
  setCompareList(getCompareList().filter((s) => s !== slug));
}

export function clearCompareList(): void {
  setCompareList([]);
}
