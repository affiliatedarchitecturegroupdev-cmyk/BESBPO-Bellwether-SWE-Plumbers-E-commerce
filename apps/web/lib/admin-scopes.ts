// Single source of truth for "does this session have any admin access at
// all" — used by both middleware.ts (gates /admin) and Header.tsx (shows
// or hides the Admin nav link). Was previously duplicated in both files
// and drifted out of sync once (Phase 4 added five new admin scopes;
// only one of the two copies got updated at first). Add new admin scopes
// here, not in either file directly.
//
// orders:read/bookings:read included alongside their :manage
// counterparts — a read-only support role should see the Admin nav and
// reach /admin pages, same as a write-capable admin. The actual
// read/write distinction is enforced correctly at the API layer (see
// AnyScope in apps/api's scopes.decorator.ts), which is the real
// security boundary regardless of what this list contains — but this
// frontend doesn't yet hide/disable write controls (buttons, forms) for
// a read-only caller; they'd see the same admin UI and get a real 403
// from the API if they tried to submit a write action. A real, stated
// follow-up, not something this pass claims to have fully solved.
export const ADMIN_SCOPES = [
  'accounts:read',
  'products:write',
  'categories:write',
  'bundles:write',
  'orders:manage',
  'orders:read',
  'bookings:manage',
  'bookings:read',
  'warranty:manage',
  'compliance:manage',
  'trade-credit:manage',
  'trade-applications:manage',
  'quotes:manage',
];
