'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeFromClearanceAction, setClearancePriceAction } from '@/lib/actions/admin-products';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  product: {
    id: string;
    sku: string;
    name: string;
    stockQty: number;
    retailPrice: string;
    salePrice: string | null;
    saleEndsAt: string | null;
  };
}

export function ClearanceCandidateRow({ product }: Props) {
  const [salePrice, setSalePrice] = useState(product.salePrice ?? '');
  const [saleEndsAt, setSaleEndsAt] = useState(product.saleEndsAt ? product.saleEndsAt.slice(0, 10) : '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isActive = product.salePrice !== null;

  function handleSet() {
    const price = Number(salePrice);
    if (!price || price <= 0) {
      setError('Enter a valid sale price greater than zero.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setClearancePriceAction(
        product.id,
        price,
        saleEndsAt ? new Date(saleEndsAt).toISOString() : null,
      );
      if (!result.ok) {
        setError(result.error ?? 'Could not set the clearance price');
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromClearanceAction(product.id);
      router.refresh();
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm font-semibold">{product.name}</div>
          <div className="font-mono text-[11px] text-steel">
            {product.sku} · {product.stockQty} in stock · Retail {zar.format(Number(product.retailPrice))}
          </div>
        </div>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          placeholder="Sale price"
          className="w-28 border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <input
          type="date"
          value={saleEndsAt}
          onChange={(e) => setSaleEndsAt(e.target.value)}
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
          title="Optional — leave blank for no scheduled end"
        />
        <button
          onClick={handleSet}
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-3 py-1.5 rounded-sm disabled:opacity-60"
        >
          {isActive ? 'Update' : 'Set Clearance'}
        </button>
        {isActive && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="font-mono text-[11px] text-steel hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-[11.5px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
