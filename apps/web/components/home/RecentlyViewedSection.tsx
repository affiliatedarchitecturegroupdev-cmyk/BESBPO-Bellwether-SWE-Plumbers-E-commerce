'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getRecentlyViewed } from '@/lib/recently-viewed';
import { Product } from '@/lib/types';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

// Client component, not server — the viewed-products list only exists
// in this browser's localStorage. Fetches each product by slug
// individually, same reasoning as the /compare page: no "get many
// products at once" endpoint exists, and this is a small (max 10),
// occasionally-used list, not worth adding one for.
export function RecentlyViewedSection() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const slugs = getRecentlyViewed();
    if (slugs.length === 0) return;
    Promise.all(slugs.map((slug) => apiClient.get<Product>(`/v1/products/${slug}`).catch(() => null))).then(
      (results) => setProducts(results.filter((p): p is Product => p !== null)),
    );
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-8 py-14">
      <h2 className="text-2xl font-display font-bold mb-7">Recently Viewed</h2>
      <div className="grid grid-cols-5 gap-4">
        {products.slice(0, 5).map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="border border-black/10 rounded-sm p-3 hover:border-hydra transition-colors"
          >
            <div className="aspect-square bg-porcelain rounded-sm mb-2" />
            <div className="text-[11.5px] font-semibold line-clamp-2 mb-1">{product.name}</div>
            <div className="text-[12px] font-bold">{zar.format(Number(product.retailPrice))}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
