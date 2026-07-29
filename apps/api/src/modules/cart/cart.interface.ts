// Moved to packages/shared-types/src/cart.ts — re-exported here so every
// existing import of `from './cart.interface'` elsewhere in this module
// keeps working unchanged. New code should import directly from
// '@bellwether/shared-types' instead; this re-export exists for
// backward compatibility during the migration, not as the long-term home
// for these types.
export type { PricedCart, PricedCartLine } from '@bellwether/shared-types';
