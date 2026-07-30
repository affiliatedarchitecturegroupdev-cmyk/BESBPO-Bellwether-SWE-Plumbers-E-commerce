// Mirrors apps/api/src/common/utils/courier.util.ts's resolveTrackingUrl —
// kept as a small, deliberate duplicate rather than having the order API
// resolve and inject this server-side, since it's presentation logic (which
// link to show), not business logic. Keep both lists in sync if either
// changes; each entry here is a verified courier tracking homepage, not a
// guessed one — see the API-side file for why no deep-link pattern is used.
const KNOWN_COURIER_TRACKING_PAGES: Record<string, string> = {
  'the courier guy': 'https://thecourierguy.co.za/tracking/',
  'courier guy': 'https://thecourierguy.co.za/tracking/',
  ram: 'https://www.ram.co.za/track',
  'ram couriers': 'https://www.ram.co.za/track',
  dhl: 'https://www.dhl.com/za-en/home/tracking.html',
  'fastway': 'https://www.fastway.co.za/track',
  'courier-it': 'https://www.courierit.co.za/',
  'south african post office': 'https://www.trackandtrace.co.za/',
  sapo: 'https://www.trackandtrace.co.za/',
  'post office': 'https://www.trackandtrace.co.za/',
  skynet: 'https://www.skynet.co.za/track-a-shipment',
  'sky net': 'https://www.skynet.co.za/track-a-shipment',
  tba: 'https://www.tba.com/',
  'to be arranged': 'https://www.tba.com/',
  aramex: 'https://www.aramex.com/track-results',
  dpex: 'https://www.dpex.com/',
  'lexship': 'https://www.lexship.com/',
  'pudo': 'https://www.pudo.co.za/',
};

export function resolveTrackingUrl(courierName: string | null, trackingUrl: string | null): string | null {
  if (trackingUrl) return trackingUrl;
  if (!courierName) return null;
  return KNOWN_COURIER_TRACKING_PAGES[courierName.trim().toLowerCase()] ?? null;
}

// Courier information for display purposes
export interface CourierInfo {
  name: string;
  logo?: string;
  trackingPage: string;
  phone?: string;
  email?: string;
}

export const COURIER_INFO: Record<string, CourierInfo> = {
  'the courier guy': {
    name: 'The Courier Guy',
    trackingPage: 'https://thecourierguy.co.za/tracking/',
    phone: '087 151 5555',
    email: 'support@thecourierguy.co.za',
  },
  ram: {
    name: 'RAM Couriers',
    trackingPage: 'https://www.ram.co.za/track',
    phone: '0861 000 726',
  },
  dhl: {
    name: 'DHL Express',
    trackingPage: 'https://www.dhl.com/za-en/home/tracking.html',
    phone: '0860 345 000',
  },
  fastway: {
    name: 'Fastway Couriers',
    trackingPage: 'https://www.fastway.co.za/track',
    phone: '0861 150 250',
  },
  skynet: {
    name: 'SkyNet',
    trackingPage: 'https://www.skynet.co.za/track-a-shipment',
    phone: '0860 100 123',
  },
  aramex: {
    name: 'Aramex',
    trackingPage: 'https://www.aramex.com/track-results',
    phone: '011 387 3000',
  },
};

export function getCourierInfo(courierName: string | null | undefined): CourierInfo | null {
  if (!courierName) return null;
  return COURIER_INFO[courierName.trim().toLowerCase()] ?? null;
}
