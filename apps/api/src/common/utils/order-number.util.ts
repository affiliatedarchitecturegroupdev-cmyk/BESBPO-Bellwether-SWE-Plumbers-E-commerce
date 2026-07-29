import { randomBytes } from 'crypto';

// Format: BSWE-20260722-K3F9X2 — date for humans scanning a list, a 6-char
// base36 random suffix for uniqueness. Not a DB sequence: at this order
// volume, a 36^6 (~2.2 billion) keyspace makes collision negligible without
// needing a dedicated counter table. If volume ever justifies it, swap this
// for a Postgres sequence — the call site (OrdersService) doesn't change.
export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `BSWE-${date}-${suffix}`;
}
