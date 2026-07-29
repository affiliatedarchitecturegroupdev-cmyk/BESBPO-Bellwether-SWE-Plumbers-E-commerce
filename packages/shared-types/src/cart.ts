// Originally defined only in apps/api/src/modules/cart/cart.interface.ts,
// with apps/web/lib/types.ts hand-maintaining a copy alongside a comment
// explicitly noting the duplication risk. Moved here as this package's
// first migrated type — apps/api now re-exports these from here instead
// of defining them independently, and apps/web imports them directly.

export interface PricedCartLine {
  cartItemId: string;
  productId: string;
  productSlug: string;
  name: string;
  imageUrl: string | null;
  // The FINAL, actually-charged per-unit price — already reflects any
  // qualifying tier discount (see appliedTierDiscount below). lineTotal
  // is unitPrice * quantity, using this price, not baseUnitPrice.
  unitPrice: number;
  // What the unit price would be WITHOUT any tier discount — equal to
  // unitPrice whenever no tier applies. Kept separate (not just
  // reconstructable from unitPrice + percent) so the frontend can show
  // a real "was RX, now RY" comparison without doing its own reverse-
  // percentage math.
  baseUnitPrice: number;
  // The discount percent actually applied to this line, if any — null
  // when the quantity doesn't qualify for any tier. See
  // common/utils/price-tier.util.ts's resolveBestTier on the API side
  // for how this is chosen (the highest-qualifying tier, not the first
  // match).
  appliedTierDiscount: number | null;
  quantity: number;
  lineTotal: number;
}

export interface PricedCart {
  cartId: string;
  usingTradePricing: boolean;
  lines: PricedCartLine[];
  subtotal: number; // pre-discount — unchanged meaning even now that a coupon can apply, see discountAmount below
  // Both null/0 when no coupon is applied. couponCode reflects whatever
  // is currently on Cart.couponCode even if it no longer validates (see
  // couponError) — the customer's entered code isn't silently discarded
  // just because it stopped working; they can see it and remove it
  // deliberately instead.
  couponCode: string | null;
  discountAmount: number;
  // Set when couponCode is present but CouponsService.validateAndCompute
  // currently rejects it (expired since being applied, cart dropped
  // below the minimum after an item was removed, etc.) — surfaces WHY,
  // rather than the discount just silently disappearing with no
  // explanation. Null whenever couponCode is null or currently valid.
  couponError: string | null;
  vatAmount: number; // computed on (subtotal - discountAmount), not on subtotal directly — VAT applies to the discounted value
  total: number;
}
