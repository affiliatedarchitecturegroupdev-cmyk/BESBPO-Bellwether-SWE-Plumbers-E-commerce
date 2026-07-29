// Mirrors apps/api/src/common/utils/courier.util.ts's resolveTrackingUrl —
// kept as a small, deliberate duplicate rather than having the order API
// resolve and inject this server-side, since it's presentation logic (which
// link to show), not business logic. Keep both lists in sync if either
// changes; each entry here is a verified courier tracking homepage, not a
// guessed one — see the API-side file for why no deep-link pattern is used.
const KNOWN_COURIER_TRACKING_PAGES: Record<string, string> = {
  'the courier guy': 'https://thecourierguy.co.za/tracking/',
  ram: 'https://www.ram.co.za/track',
};

export function resolveTrackingUrl(courierName: string | null, trackingUrl: string | null): string | null {
  if (trackingUrl) return trackingUrl;
  if (!courierName) return null;
  return KNOWN_COURIER_TRACKING_PAGES[courierName.trim().toLowerCase()] ?? null;
}
