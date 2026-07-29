import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { LowStockRow } from '@/components/admin/LowStockRow';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQty: number;
  unitsSoldInWindow: number;
  daysOfStockRemaining: number;
}

// The inverse of Clearance: Clearance finds real stock with too little
// movement; this finds real stock moving too fast relative to what's
// left. Deliberately NOT a flat "stockQty < N" threshold — see
// ProductsService.findLowStock's own comment for why that would flag a
// slow, 20-units-left product exactly the same as a fast-selling one
// about to run out, when only one of those is actually urgent.
export default async function AdminLowStockPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const products = await apiClient.get<LowStockProduct[]>('/v1/products/low-stock', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Low Stock</h1>
      <p className="text-sm text-steel mb-8">
        Products selling fast enough, relative to what&apos;s left, to be worth reordering soon — ranked by
        real days of stock remaining, not just a flat quantity threshold.
      </p>

      {products.length === 0 ? (
        <p className="text-sm text-steel">Nothing urgent right now.</p>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <LowStockRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
