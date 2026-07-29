'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restockProductAction } from '@/lib/actions/admin-products';

interface Props {
  productId: string;
}

export function RestockControl({ productId }: Props) {
  const [quantity, setQuantity] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit() {
    const parsed = Number(quantity);
    if (!parsed || parsed <= 0) {
      setError('Enter a positive quantity');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await restockProductAction(productId, parsed);
      if (!result.ok) {
        setError(result.error ?? 'Failed');
        return;
      }
      setQuantity('');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="+qty"
        className="w-16 border border-black/15 rounded-sm px-1.5 py-1 text-[12px]"
      />
      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="font-mono text-[10.5px] uppercase text-hydra disabled:opacity-60"
      >
        {isPending ? '…' : 'Restock'}
      </button>
      {error && <span className="text-[10.5px] text-red-600">{error}</span>}
    </div>
  );
}
