'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restockProductAction } from '@/lib/actions/admin-products';

interface Props {
  product: {
    id: string;
    name: string;
    sku: string;
    stockQty: number;
    unitsSoldInWindow: number;
    daysOfStockRemaining: number;
  };
}

export function LowStockRow({ product }: Props) {
  const [quantity, setQuantity] = useState(product.unitsSoldInWindow || 10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleRestock() {
    setError(null);
    startTransition(async () => {
      const result = await restockProductAction(product.id, quantity);
      if (!result.ok) {
        setError(result.error ?? 'Restock failed');
        return;
      }
      router.refresh();
    });
  }

  const urgency = product.daysOfStockRemaining <= 5 ? 'text-[#B23A3A]' : 'text-[#B8860B]';

  return (
    <div className="border border-black/10 rounded-sm p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="text-sm font-semibold">{product.name}</div>
        <div className="font-mono text-[11px] text-steel">
          {product.sku} · {product.stockQty} left · {product.unitsSoldInWindow} sold in last 30 days
        </div>
      </div>
      <div className={`font-mono text-[12px] uppercase tracking-wide ${urgency} whitespace-nowrap`}>
        ~{product.daysOfStockRemaining} day{product.daysOfStockRemaining === 1 ? '' : 's'} left
      </div>
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="w-20 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
      />
      <button
        onClick={handleRestock}
        disabled={isPending}
        className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-3 py-1.5 rounded-sm disabled:opacity-60 whitespace-nowrap"
      >
        {isPending ? '…' : 'Restock'}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
