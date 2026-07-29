'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkAddToCartAction } from '@/lib/actions/cart-actions';
import { ProductCombobox } from '@/components/commerce/ProductCombobox';

interface WorkingRow {
  id: string;
  sku: string;
  name: string;
  tradePrice: string;
  quantity: number;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

// Rebuilt around ProductCombobox instead of rendering every product in
// the catalog as a table row — see that component's own comment for why
// (the old pageSize=200 fetch was silently failing against the API's
// own cap, and a table of 8,491 rows was never a workable UI regardless
// of that bug). The table itself — SKU, name, trade price, quantity — is
// kept exactly as it was; only how it gets populated has changed, from
// "every product, all at once" to "search, add, then quantity."
export function BulkOrderTable() {
  const [rows, setRows] = useState<WorkingRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const router = useRouter();

  function addProduct(product: { id: string; name: string; sku: string; tradePrice: string }) {
    setRows((prev) => [
      ...prev,
      { id: product.id, sku: product.sku, name: product.name, tradePrice: product.tradePrice, quantity: 1 },
    ]);
  }

  function setQuantity(productId: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === productId ? { ...r, quantity: Math.max(0, value) } : r)));
  }

  function removeRow(productId: string) {
    setRows((prev) => prev.filter((r) => r.id !== productId));
  }

  function handleSubmit() {
    const items = rows.filter((r) => r.quantity > 0).map((r) => ({ productId: r.id, quantity: r.quantity }));

    if (items.length === 0) {
      setResult({ ok: false, error: 'Add at least one product with a quantity greater than zero.' });
      return;
    }

    startTransition(async () => {
      const outcome = await bulkAddToCartAction(items);
      setResult(outcome);
      if (outcome.ok) {
        setRows([]);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-4">
        <ProductCombobox onSelect={addProduct} excludeIds={rows.map((r) => r.id)} />
      </div>

      {rows.length > 0 && (
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">SKU</th>
              <th className="pb-2 font-normal">Product</th>
              <th className="pb-2 font-normal text-right">Trade Price</th>
              <th className="pb-2 font-normal text-right w-24">Qty</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5">
                <td className="py-2.5 font-mono text-[12px] text-steel">{row.sku}</td>
                <td className="py-2.5">{row.name}</td>
                <td className="py-2.5 text-right font-mono">{zar.format(Number(row.tradePrice))}</td>
                <td className="py-2.5 text-right">
                  <input
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => setQuantity(row.id, Number(e.target.value))}
                    className="w-20 border border-black/15 rounded-sm px-2 py-1.5 text-sm text-right"
                  />
                </td>
                <td className="py-2.5">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="font-mono text-[11px] text-steel hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result?.error && <p className="text-[12.5px] text-red-600 mb-3">{result.error}</p>}
      {result?.ok && (
        <p className="text-[12.5px] text-[#1E8E5A] mb-3">Added to cart. Head to your cart to check out.</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || rows.length === 0}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Adding…' : 'Add All to Cart'}
      </button>
    </div>
  );
}
