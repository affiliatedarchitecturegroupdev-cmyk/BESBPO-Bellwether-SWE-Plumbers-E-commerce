import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Paginated, Product } from '@/lib/types';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { RestockControl } from '@/components/admin/RestockControl';
import { BulkImportExportPanel } from '@/components/admin/BulkImportExportPanel';
import { deleteProductAction } from '@/lib/actions/admin-products';

// Force dynamic rendering - this page fetches from API
export const dynamic = 'force-dynamic';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const LOW_STOCK_THRESHOLD = 10;

export default async function AdminProductsPage() {
  const products = await apiClient.get<Paginated<Product>>('/v1/products?pageSize=100');

  return (
    <div>
      <div className="flex justify-between items-baseline mb-6">
        <h1 className="font-display text-xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="font-mono text-[12px] text-hydra">
          + New product
        </Link>
      </div>

      <BulkImportExportPanel />

      {products.items.length === 0 ? (
        <p className="text-sm text-steel">No products yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">SKU</th>
              <th className="pb-2 font-normal">Category</th>
              <th className="pb-2 font-normal text-right">Retail</th>
              <th className="pb-2 font-normal text-right">Stock</th>
              <th className="pb-2 font-normal">Restock</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {products.items.map((product) => (
              <tr key={product.id} className="border-b border-black/5">
                <td className="py-2.5">
                  <Link href={`/admin/products/${product.slug}`} className="hover:text-hydra">
                    {product.name}
                  </Link>
                </td>
                <td className="py-2.5 font-mono text-[12px] text-steel">{product.sku}</td>
                <td className="py-2.5 text-steel">{product.category.name}</td>
                <td className="py-2.5 text-right font-mono">{zar.format(Number(product.retailPrice))}</td>
                <td
                  className={`py-2.5 text-right ${
                    product.stockQty <= LOW_STOCK_THRESHOLD ? 'text-red-600 font-semibold' : ''
                  }`}
                >
                  {product.stockQty}
                  {product.stockQty <= LOW_STOCK_THRESHOLD && (
                    <span className="font-mono text-[9.5px] uppercase ml-1.5">Low</span>
                  )}
                </td>
                <td className="py-2.5">
                  <RestockControl productId={product.id} />
                </td>
                <td className="py-2.5 text-right">
                  <DeleteButton action={deleteProductAction} id={product.id} itemLabel={product.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
