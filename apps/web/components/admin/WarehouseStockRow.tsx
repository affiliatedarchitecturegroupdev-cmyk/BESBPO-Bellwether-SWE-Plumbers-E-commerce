'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setWarehouseStockAction } from '@/lib/actions/admin-warehouses';

interface Props {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productSlug: string;
  currentQuantity: number;
}

export function WarehouseStockRow({ warehouseId, warehouseName, productId, productSlug, currentQuantity }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await setWarehouseStockAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not update stock');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 py-2 border-b border-black/5">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <span className="text-sm flex-1">{warehouseName}</span>
      <input
        name="quantity"
        type="number"
        min={0}
        defaultValue={currentQuantity}
        className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 hover:border-hydra disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </form>
  );
}
