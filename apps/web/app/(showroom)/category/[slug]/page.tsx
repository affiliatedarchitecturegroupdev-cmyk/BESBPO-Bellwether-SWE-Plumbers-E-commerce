import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { apiClient, ApiError } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductFilterBar } from '@/components/commerce/ProductFilterBar';
import { Paginated, Product } from '@/lib/types';

interface CategoryDetail {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  children: { id: string; slug: string; name: string }[];
}

interface Props {
  params: { slug: string };
  searchParams: { minPrice?: string; maxPrice?: string; inStockOnly?: string; sortBy?: string; brand?: string };
}

// Reuses the same fetchCategory helper the page component itself calls
// below (Next.js memoizes identical fetch calls within one request). Was
// missing entirely before this — every category page showed the same
// site-wide title regardless of which of the 19 real categories was
// open, identical to how a search engine would see any other category.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await fetchCategory(params.slug);
  if (!category) return {};

  return {
    title: `${category.name} | Bellwether SWE Plumbers`,
    description: `Shop ${category.name} at Bellwether SWE Plumbers — trade and retail pricing, in stock.`,
  };
}

// Deliberately shows only products whose categoryId exactly matches this
// category — not products from descendant categories too. A real
// hierarchy-aware "everything under Pipes & Fittings" view would need
// either a recursive category-id collection or a different query shape;
// this is the simpler, "minimal" interpretation for now. Child categories
// are listed as their own links so a visitor can drill down manually.
export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await fetchCategory(params.slug);
  if (!category) notFound();

  const query = new URLSearchParams({ categoryId: category.id, pageSize: '24' });
  if (searchParams.minPrice) query.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) query.set('maxPrice', searchParams.maxPrice);
  if (searchParams.inStockOnly) query.set('inStockOnly', searchParams.inStockOnly);
  if (searchParams.sortBy) query.set('sortBy', searchParams.sortBy);
  if (searchParams.brand) query.set('brand', searchParams.brand);

  const [products, account, brands] = await Promise.all([
    apiClient.get<Paginated<Product>>(`/v1/products?${query.toString()}`),
    getCurrentAccount(),
    apiClient.get<string[]>('/v1/products/brands'),
  ]);

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-10">
      <p className="font-mono text-[11px] text-steel mb-2">
        <Link href="/">Home</Link> / {category.name}
      </p>
      <h1 className="font-display text-2xl font-bold mb-6">{category.name}</h1>

      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 hover:border-hydra"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <ProductFilterBar action={`/category/${params.slug}`} brands={brands} currentValues={searchParams} />

      {products.items.length === 0 ? (
        <p className="text-sm text-steel py-10">No products match these filters.</p>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} isTradeAccount={account?.type === 'TRADE'} />
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    return await apiClient.get<CategoryDetail>(`/v1/categories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
