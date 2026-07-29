import { Metadata } from 'next';
import { apiClient } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductFilterBar } from '@/components/commerce/ProductFilterBar';
import { Paginated, Product } from '@/lib/types';

// Static, not generateMetadata — results vary by query, but the page's
// own title/description don't need to (search-result pages are commonly
// left generic rather than trying to describe every possible query
// string). Also doubles as "browse everything" when q is empty — see
// the home page's own comment on why "Browse all" now points here.
export const metadata: Metadata = {
  title: 'Search Products | Bellwether SWE Plumbers',
  description: 'Search the full Bellwether SWE Plumbers catalog — pipes, fittings, valves, pumps, and more.',
};

interface SearchApiResult {
  originalQuery: string;
  expandedQuery: string;
  results: Paginated<Product>;
}

interface Props {
  searchParams: {
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    inStockOnly?: string;
    sortBy?: string;
    brand?: string;
  };
}

// Calls /v1/search (apps/api), which itself calls apps/ai-service's
// query-expansion endpoint and falls back to plain Postgres full-text
// search if that's unavailable — see SearchService on the API. This page
// doesn't know or care which path served the results; it always gets back
// the same shape. Filters (price/stock/sort/brand) are forwarded to
// SearchService, which forwards them to whichever path actually runs —
// see docs/AGENTS.md's search section.
export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() ?? '';

  if (!q) {
    return (
      <div className="max-w-[1240px] mx-auto px-8 py-16 text-center">
        <p className="text-sm text-steel">Enter a search term above to find products.</p>
      </div>
    );
  }

  const query = new URLSearchParams({ q, pageSize: '24' });
  if (searchParams.minPrice) query.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) query.set('maxPrice', searchParams.maxPrice);
  if (searchParams.inStockOnly) query.set('inStockOnly', searchParams.inStockOnly);
  if (searchParams.sortBy) query.set('sortBy', searchParams.sortBy);
  if (searchParams.brand) query.set('brand', searchParams.brand);

  const [search, account, brands] = await Promise.all([
    apiClient.get<SearchApiResult>(`/v1/search?${query.toString()}`),
    getCurrentAccount(),
    apiClient.get<string[]>('/v1/products/brands'),
  ]);

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">
        Results for &ldquo;{search.originalQuery}&rdquo;
      </h1>
      <p className="font-mono text-[11px] text-steel mb-6">{search.results.total} products found</p>

      <ProductFilterBar action="/search" hiddenFields={{ q }} brands={brands} currentValues={searchParams} />

      {search.results.items.length === 0 ? (
        <p className="text-sm text-steel py-10">
          No products matched. Try a different term or fewer filters, or browse by category from the home page.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {search.results.items.map((product) => (
            <ProductCard key={product.id} product={product} isTradeAccount={account?.type === 'TRADE'} />
          ))}
        </div>
      )}
    </div>
  );
}
