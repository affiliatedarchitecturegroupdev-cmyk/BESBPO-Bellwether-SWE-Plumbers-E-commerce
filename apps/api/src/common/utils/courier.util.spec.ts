import { resolveTrackingUrl } from './courier.util';

describe('resolveTrackingUrl', () => {
  it('prefers an admin-supplied direct URL over anything else', () => {
    const result = resolveTrackingUrl('RAM', 'https://example.com/direct-link');
    expect(result).toBe('https://example.com/direct-link');
  });

  it('falls back to a known courier general tracking page, case-insensitively', () => {
    expect(resolveTrackingUrl('ram', null)).toBe('https://www.ram.co.za/track');
    expect(resolveTrackingUrl('The Courier Guy', null)).toBe('https://thecourierguy.co.za/tracking/');
  });

  it('returns null, not a guessed URL, for an unrecognized courier', () => {
    expect(resolveTrackingUrl('Some Courier Nobody Verified', null)).toBeNull();
  });

  it('returns null when neither a direct URL nor a courier name is given', () => {
    expect(resolveTrackingUrl(null, null)).toBeNull();
  });
});
