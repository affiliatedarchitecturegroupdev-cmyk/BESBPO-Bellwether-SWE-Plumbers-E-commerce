import Link from 'next/link';
import { Metadata } from 'next';
import { apiClient } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { Paginated, Product } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Clearance | Bellwether SWE Plumbers',
  description: 'Genuine overstock, reviewed and confirmed by our team — not arbitrary discounting.',
};

interface Props {
  searchParams: { page?: string };
}

function buildPageHref(page: number): string {
  return `/clearance?page=${page}`;
}

// The full listing behind the homepage's "Clearance" preview section —
// same GET /v1/products/on-sale endpoint, just with a real page number
// instead of always page 1. Only ever shows products an admin has
// already reviewed and confirmed a sale price for at /admin/clearance —
// see ProductsService.findOnSale's own comment for why this stays a
// plain filter, not a detection query, at the API layer.
export default async function ClearancePage({ searchParams }: Props) {
  const page = Number(searchParams.page ?? '1') || 1;
  const [result, account] = await Promise.all([
    apiClient.get<Paginated<Product>>(`/v1/products/on-sale?page=${page}&pageSize=24`),
    getCurrentAccount(),
  ]);
  const isTradeAccount = account?.type === 'TRADE';

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-14">
      <h1 className="font-display text-2xl font-bold mb-2">Clearance</h1>
      <p className="text-sm text-steel mb-10">
        Genuine overstock, reviewed and confirmed by our team — {result.total} item{result.total === 1 ? '' : 's'}{' '}
        currently on sale.
      </p>

      {result.items.length === 0 ? (
        <p className="text-sm text-steel">Nothing on clearance right now — check back soon.</p>
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
