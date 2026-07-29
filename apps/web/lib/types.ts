// Category/ProductImage/Product/Paginated/PricedCart/PricedCartLine now
// live in packages/shared-types — imported and re-exported here rather
// than hand-duplicated, which is what this file used to do (see git
// history / docs/AGENTS.md's shared-types section for why that was a
// real, stated risk this migration closes). New code should import
// directly from '@bellwether/shared-types' where practical; this
// re-export exists so every existing `from '@/lib/types'` import
// elsewhere in this app keeps working unchanged.
export type {
  Category,
  ProductImage,
  Product,
  Paginated,
  PricedCart,
  PricedCartLine,
} from '@bellwether/shared-types';

// Kept as a local alias, not a new type — every existing `CartLine`
// import elsewhere in this app (CartLineRow.tsx) keeps working
// unchanged; the underlying shape is PricedCartLine from the shared
// package, not a separately maintained duplicate anymore.
export type { PricedCartLine as CartLine } from '@bellwether/shared-types';

// Genuinely local to this app — not returned directly by any single API
// endpoint in a way that would benefit from being shared; addresses are
// composed into other shapes (e.g. Order.shippingAddress) differently
// depending on context.
export interface Address {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}
