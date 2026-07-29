// Shared across pricing.service.ts and cart.service.ts — anywhere a ZAR
// amount is computed gets rounded through here, not with an inline
// Math.round wherever it happens to be needed.
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const VAT_RATE = 0.15; // South Africa standard VAT — shared so it's one place to change, not several
