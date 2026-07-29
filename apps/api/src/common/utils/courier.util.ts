// Deliberately NOT a deep-link generator (e.g. "courier.co.za/track?wb=123")
// — no confirmed, working query-parameter pattern exists for South
// African couriers' public tracking pages (checked before assuming one;
// see docs/AGENTS.md's logistics section). Each entry here is a courier's
// own general tracking homepage, verified directly, not guessed — the
// customer pastes their tracking number in themselves once there. Only
// two couriers are listed because only two were actually verified; add
// more only after checking, not by pattern-matching a URL that looks
// plausible.
const KNOWN_COURIER_TRACKING_PAGES: Record<string, string> = {
  'the courier guy': 'https://thecourierguy.co.za/tracking/',
  ram: 'https://www.ram.co.za/track',
};

// Returns the best tracking link available: an admin-supplied direct URL
// first (their courier's own shipment confirmation sometimes includes
// one already), falling back to a known courier's general tracking page,
// or null if neither is available — callers should show the tracking
// number as plain text in that case, not a broken or guessed link.
export function resolveTrackingUrl(courierName: string | null, trackingUrl: string | null): string | null {
  if (trackingUrl) return trackingUrl;
  if (!courierName) return null;
  return KNOWN_COURIER_TRACKING_PAGES[courierName.trim().toLowerCase()] ?? null;
}
