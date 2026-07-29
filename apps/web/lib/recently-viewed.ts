const STORAGE_KEY = 'bswe-recently-viewed';
const MAX_ITEMS = 10;

// Same pattern as compare-list.ts: product SLUGS (not IDs — no by-ID
// product endpoint exists, only by-slug), plain localStorage, no
// server-side storage at all. Most-recent-first; visiting a product
// already in the list moves it to the front rather than duplicating it.
export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordProductView(slug: string): void {
  if (typeof window === 'undefined') return;
  const current = getRecentlyViewed().filter((s) => s !== slug);
  const updated = [slug, ...current].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
