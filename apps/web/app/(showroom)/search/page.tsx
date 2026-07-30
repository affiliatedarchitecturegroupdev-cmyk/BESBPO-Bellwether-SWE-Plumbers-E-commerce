import { Metadata } from 'next';
import Link from 'next/link';
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
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">
        {q ? <>Results for &ldquo;{search.originalQuery}&rdquo;</> : 'Browse All Products'}
      </h1>
      {q && (
        <p className="font-mono text-[11px] text-steel mb-4 sm:mb-6">
          {search.results.total} {search.results.total === 1 ? 'product' : 'products'} found
        </p>
      )}

      <ProductFilterBar action="/search" hiddenFields={{ q }} brands={brands} currentValues={searchParams} />

      {search.results.items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-steel/10 mb-6">
            <svg className="w-8 h-8 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2">No products found</h2>
          <p className="text-sm text-steel mb-6 max-w-md mx-auto">
            We couldn&apos;t find any products matching &ldquo;{search.originalQuery}&rdquo;.
            Try adjusting your search or filters.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="px-5 py-2.5 bg-hydra text-white text-sm rounded-sm hover:bg-hydra/90 transition-colors"
            >
              Clear Search
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 border border-black/20 text-ink text-sm rounded-sm hover:bg-black/5 transition-colors"
            >
              Browse Categories
            </Link>
          </div>
          <div className="mt-10 pt-8 border-t border-black/10">
            <p className="text-sm text-steel mb-4">Popular categories:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Toilets', 'Basins', 'Baths', 'Showers', 'Taps', 'Geysers'].map((cat) => (
                <Link
                  key={cat}
                  href={`/category/${cat.toLowerCase()}`}
                  className="px-3 py-1.5 text-xs bg-black/5 hover:bg-black/10 rounded-sm transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {search.results.items.map((product) => (
            <ProductCard key={product.id} product={product} isTradeAccount={account?.type === 'TRADE'} />
          ))}
        </div>
      )}
    </div>
  );
}
