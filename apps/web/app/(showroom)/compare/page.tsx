'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { clearCompareList, getCompareList, removeFromCompareList } from '@/lib/compare-list';
import { Product } from '@/lib/types';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

// Client component, not a server one — the compare list only exists in
// this browser's localStorage, which isn't readable server-side at all.
// Fetches each product by slug individually (there's no existing "get
// many products at once" endpoint, and 2-4 individual requests for a
// feature used this occasionally isn't worth adding one for), reusing
// the exact same GET /v1/products/:slug the PDP itself already relies
// on — not a by-ID lookup, since no such endpoint exists (see
// compare-list.ts's own comment).
export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const slugs = getCompareList();
    if (slugs.length === 0) {
      setIsLoading(false);
      return;
    }
    Promise.all(slugs.map((slug) => apiClient.get<Product>(`/v1/products/${slug}`).catch(() => null)))
      .then((results) => setProducts(results.filter((p): p is Product => p !== null)))
      .finally(() => setIsLoading(false));
  }, []);

  function handleRemove(slug: string) {
    removeFromCompareList(slug);
    setProducts((prev) => prev.filter((p) => p.slug !== slug));
  }

  if (isLoading) {
    return <div className="max-w-[1000px] mx-auto px-8 py-16 text-sm text-steel">Loading…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="max-w-[1000px] mx-auto px-8 py-16 text-center">
        <h1 className="font-display text-xl font-bold mb-3">Nothing to compare yet</h1>
        <p className="text-sm text-steel mb-8">
          Add products to compare from any product listing using the &quot;+ Compare&quot; link on each card.
        </p>
        <Link href="/" className="font-mono text-[12px] text-hydra">
          ← Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-xl font-bold">Compare Products</h1>
        <button
          onClick={() => {
            clearCompareList();
            setProducts([]);
          }}
          className="font-mono text-[11px] text-steel hover:text-red-600"
        >
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="w-32"></th>
              {products.map((product) => (
                <th key={product.id} className="text-left px-4 pb-3 align-top min-w-[200px]">
                  <Link href={`/product/${product.slug}`} className="font-semibold hover:text-hydra">
                    {product.name}
                  </Link>
                  <button
                    onClick={() => handleRemove(product.slug)}
                    className="block font-mono text-[10.5px] text-steel hover:text-red-600 mt-1"
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Retail Price" values={products.map((p) => zar.format(Number(p.retailPrice)))} />
            <CompareRow label="Trade Price" values={products.map((p) => zar.format(Number(p.tradePrice)))} />
            <CompareRow label="Brand" values={products.map((p) => p.brand ?? '—')} />
            <CompareRow label="Category" values={products.map((p) => p.category.name)} />
            <CompareRow
              label="In Stock"
              values={products.map((p) => (p.stockQty > 0 ? `${p.stockQty} available` : 'Out of stock'))}
            />
            <CompareRow
              label="Rating"
              values={products.map((p) =>
                p.averageRating != null
                  ? `${p.averageRating.toFixed(1)} (${p.reviewCount ?? 0} reviews)`
                  : 'No reviews yet',
              )}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t border-black/10">
      <td className="font-mono text-[10.5px] uppercase tracking-wide text-steel py-3 pr-4 align-top">{label}</td>
      {values.map((value, i) => (
        <td key={i} className="py-3 px-4 align-top">
          {value}
        </td>
      ))}
    </tr>
  );
}
