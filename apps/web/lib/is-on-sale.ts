// A product is actively on sale when salePrice is set AND saleEndsAt is
// either null (no scheduled end) or still in the future. One shared
// check so PriceTag's price display and ProductCard's "Clearance" badge
// can't independently drift on what "active" means.
export function isOnSale(product: { salePrice: string | null; saleEndsAt: string | null }): boolean {
  if (!product.salePrice) return false;
  if (!product.saleEndsAt) return true;
  return new Date(product.saleEndsAt) > new Date();
}
