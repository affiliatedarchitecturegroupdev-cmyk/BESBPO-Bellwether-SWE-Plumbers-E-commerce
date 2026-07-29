import { resolveTrackingUrl } from './courier';

describe('resolveTrackingUrl', () => {
  it('prefers a real, admin-entered trackingUrl over any courier-name fallback', () => {
    const result = resolveTrackingUrl('The Courier Guy', 'https://real-tracking-link.example/ABC123');
    expect(result).toBe('https://real-tracking-link.example/ABC123');
  });

  it("falls back to a known courier's tracking homepage when no trackingUrl is set", () => {
    expect(resolveTrackingUrl('The Courier Guy', null)).toBe('https://thecourierguy.co.za/tracking/');
    expect(resolveTrackingUrl('RAM', null)).toBe('https://www.ram.co.za/track');
  });

  it('matches courier names case-insensitively and trims whitespace', () => {
    expect(resolveTrackingUrl('  the courier guy  ', null)).toBe('https://thecourierguy.co.za/tracking/');
    expect(resolveTrackingUrl('RAM', null)).toBe(resolveTrackingUrl('ram', null));
  });

  it('returns null for a courier not on the verified list — never guesses a deep-link pattern', () => {
    expect(resolveTrackingUrl('Some Unverified Courier', null)).toBeNull();
  });

  it('returns null when neither a trackingUrl nor a courierName is present at all', () => {
    expect(resolveTrackingUrl(null, null)).toBeNull();
  });

  it('treats an empty-string trackingUrl the same as absent, falling back to the courier name', () => {
    expect(resolveTrackingUrl('RAM', '')).toBe('https://www.ram.co.za/track');
  });
});
