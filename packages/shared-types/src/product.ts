// These represent the actual JSON shape that crosses the HTTP boundary
// between apps/api and apps/web — NOT the raw Prisma model (see
// Product.retailPrice/weightKg below: Prisma's Decimal type serializes as
// a plain string over JSON, which is what consumers actually receive, not
// a number). Kept here specifically so both sides import the SAME
// definition instead of maintaining independently hand-synced copies —
// see docs/AGENTS.md's shared-types section for which fields are
// optional and why, and the convention for adding more shared types over
// time.

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: Category;
  retailPrice: string; // Prisma Decimal serializes as a string over JSON
  tradePrice: string;
  // Both null means "not on sale," the normal case for almost every
  // product — see the schema's own comment on Product for what
  // null/present combinations mean. A null saleEndsAt does NOT mean
  // "not on sale" by itself if salePrice is set — it means "on sale
  // with no scheduled end." Anywhere this is displayed should check
  // both together, not salePrice alone (see PriceTag).
  salePrice: string | null;
  saleEndsAt: string | null;
  stockQty: number;
  sansCompliant: boolean;
  brand: string | null;
  weightKg: string; // Prisma Decimal serializes as a string over JSON, same as retailPrice/tradePrice
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  variantGroupId: string | null;
  variantValue: string | null;
  // Optional, not always present — computed in bulk by ProductsService's
  // listing endpoints (findAll/searchByText) on the API side, not by
  // every endpoint that can return a Product (e.g. a single
  // findOneBySlug lookup doesn't compute these). Populated in practice
  // wherever the frontend actually displays a rating.
  averageRating?: number | null;
  reviewCount?: number;
  images: ProductImage[];
}
