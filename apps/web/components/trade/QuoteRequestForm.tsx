'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createQuoteAction, QuoteItemInput } from '@/lib/actions/quote-actions';
import { ProductCombobox } from '@/components/commerce/ProductCombobox';

interface SelectedProduct {
  id: string;
  name: string;
  sku: string;
}

interface Row {
  useCatalogProduct: boolean;
  product: SelectedProduct | null;
  description: string;
  quantity: number;
}

const emptyRow = (): Row => ({ useCatalogProduct: true, product: null, description: '', quantity: 1 });

// Rebuilt around ProductCombobox instead of a static, server-fetched
// <select> of up to 200 products — see that component's own comment for
// why (the old fetch was silently failing against the API's own
// pageSize cap, and a dropdown would have been unusable at this
// catalog's real size regardless). The catalog-vs-custom toggle per row
// is kept exactly as it was — a quote line item genuinely can be either
// a real catalog product or free-text work that isn't in the catalog at
// all, and that distinction is real, independent of the search fix.
export function QuoteRequestForm() {
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Describe what you need in a bit more detail.');
      return;
    }
    const items: QuoteItemInput[] = rows.map((row) => {
      if (row.useCatalogProduct) {
        return { productId: row.product?.id, description: row.product?.name ?? '', quantity: row.quantity };
      }
      return { description: row.description, quantity: row.quantity };
    });

    if (items.some((item) => !item.description)) {
      setError('Every line needs either a selected product or a description.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createQuoteAction(description, items);
      if (!result.ok) {
        setError(result.error ?? 'Could not submit quote request');
        return;
      }
      router.push(`/trade/quotes/${result.quoteId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          What do you need?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Bulk copper fittings and pipe for a 12-unit residential renovation, plus 2 days of on-site installation"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[90px]"
        />
      </div>

      <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">Line Items</label>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 mb-2 items-start">
          <label className="flex items-center gap-1.5 text-[11.5px] text-steel pt-2.5 whitespace-nowrap">
            <input
              type="checkbox"
              checked={row.useCatalogProduct}
              onChange={(e) => updateRow(i, { useCatalogProduct: e.target.checked, product: null })}
            />
            Catalog
          </label>
          <div className="flex-1">
            {row.useCatalogProduct ? (
              row.product ? (
                <div className="flex items-center justify-between border border-black/15 rounded-sm px-3 py-2 text-sm">
                  <span>
                    {row.product.name} <span className="font-mono text-[11px] text-steel">({row.product.sku})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => updateRow(i, { product: null })}
                    className="font-mono text-[11px] text-hydra"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ProductCombobox onSelect={(product) => updateRow(i, { product })} />
              )
            ) : (
              <input
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                placeholder="Describe this line item"
                className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
              />
            )}
          </div>
          <input
            type="number"
            min={1}
            value={row.quantity}
            onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
            className="w-20 border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={rows.length === 1}
            className="font-mono text-[11px] text-steel hover:text-red-600 disabled:opacity-30 px-2 py-2.5"
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="font-mono text-[11px] text-hydra mb-6">
        + Add line item
      </button>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
