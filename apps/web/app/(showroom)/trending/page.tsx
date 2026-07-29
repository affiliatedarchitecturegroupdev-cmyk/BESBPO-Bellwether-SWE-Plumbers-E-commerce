import Link from 'next/link';
import { Metadata } from 'next';
import { apiClient } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { Paginated, Product } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Trending This Week | Bellwether SWE Plumbers',
  description: 'Real short-term order velocity over the last 7 days — not all-time volume.',
};

interface Props {
  searchParams: { page?: string };
}

function buildPageHref(page: number): string {
  return `/trending?page=${page}`;
}

// The full listing behind the homepage's "Trending This Week" preview
// section — same GET /v1/products/trending endpoint, just with a real
// page number instead of always page 1. See ProductsService.findTrending's
// own comment for why this is a genuinely different signal from Best
// Sellers (a 7-day window with a minimum order count, not all-time
// volume) — expect this list to be naturally shorter than most listings
// on the site, by design.
export default async function TrendingPage({ searchParams }: Props) {
  const page = Number(searchParams.page ?? '1') || 1;
  const [result, account] = await Promise.all([
    apiClient.get<Paginated<Product>>(`/v1/products/trending?page=${page}&pageSize=24`),
    getCurrentAccount(),
  ]);
  const isTradeAccount = account?.type === 'TRADE';

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-14">
      <h1 className="font-display text-2xl font-bold mb-2">Trending This Week</h1>
      <p className="text-sm text-steel mb-10">
        Real order velocity over the last 7 days, not all-time volume — {result.total} product
        {result.total === 1 ? '' : 's'} currently trending.
      </p>

      {result.items.length === 0 ? (
        <p className="text-sm text-steel">Nothing trending enough to show yet this week — check back soon.</p>
      ) : (
        <div className="grid grid-cols-4 gap-5 mb-10">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} isTradeAccount={isTradeAccount} />
          ))}
        </div>
      )}

      {result.total > result.pageSize && (
        <div className="flex gap-4">
          {page > 1 && (
            <Link href={buildPageHref(page - 1)} className="font-mono text-[12px] text-hydra">
              ← Previous
            </Link>
          )}
          {page * result.pageSize < result.total && (
            <Link href={buildPageHref(page + 1)} className="font-mono text-[12px] text-hydra">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
