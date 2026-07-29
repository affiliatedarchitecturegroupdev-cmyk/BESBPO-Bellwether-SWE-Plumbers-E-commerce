import { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api-client';

const BASE_URL = 'https://bellwetherswe.shop';

interface CategoryNode {
  slug: string;
  children: CategoryNode[];
}

interface BundleSummary {
  slug: string;
}

function flattenCategorySlugs(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.slug, ...flattenCategorySlugs(node.children)]);
}

// Next.js's special sitemap.ts convention — visiting /sitemap.xml runs this
// function and serves the result as XML automatically, no manual XML
// building needed. Only public, indexable pages belong here — /account,
// /admin, /trade, /cart, /checkout are all deliberately excluded (either
// behind auth or not meaningful for a search engine to index).
//
// A real bug lived here before this: this used to call
// GET /v1/products?pageSize=500, but the public products endpoint caps
// pageSize at 100 — the request was silently rejected (400), caught by
// this function's own try/catch below, and fell back to just the 2
// static routes. Every product and category URL was missing from the
// sitemap. Fixed by using GET /v1/products/all-slugs instead — a
// dedicated, unpaginated endpoint built specifically for this, returning
// only slugs (no pricing/stock/description), so it stays lightweight
// regardless of catalog size rather than needing an ever-larger page
// size as the catalog grows.
//
// A second real gap, found directly in Gap Analysis V: this list was
// never updated as real, public pages were added in later passes —
// bundles, Clearance, Trending, and all seven legal/informational pages
// were all live and indexable, but completely absent here. Fixed by
// adding the seven fixed pages as static routes (no new fetching needed)
// and a bundle-slugs fetch alongside the existing product/category ones.
// /clearance and /trending are dynamic listings, not identified by slug
// — included as their own listing-page URLs, same treatment as /search,
// not per-item.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/search`, changeFrequency: 'daily', priority: 0.3 },
    { url: `${BASE_URL}/bundles`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/clearance`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/trending`, changeFrequency: 'daily', priority: 0.4 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/shipping`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/returns-policy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Sitemap generation shouldn't fail the whole route if the API is
  // temporarily unreachable at build/request time — falls back to just
  // the static routes rather than a 500.
  try {
    const [productSlugs, categoryTree, bundles] = await Promise.all([
      apiClient.get<{ slug: string }[]>('/v1/products/all-slugs'),
      apiClient.get<CategoryNode[]>('/v1/categories'),
      apiClient.get<{ items: BundleSummary[] }>('/v1/bundles?pageSize=100'),
    ]);

    const productRoutes: MetadataRoute.Sitemap = productSlugs.map((product) => ({
      url: `${BASE_URL}/product/${product.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = flattenCategorySlugs(categoryTree).map((slug) => ({
      url: `${BASE_URL}/category/${slug}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    const bundleRoutes: MetadataRoute.Sitemap = bundles.items.map((bundle) => ({
      url: `${BASE_URL}/bundle/${bundle.slug}`,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...bundleRoutes];
  } catch {
    return staticRoutes;
  }
}
