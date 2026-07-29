'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPriceTierAction, removePriceTierAction } from '@/lib/actions/admin-price-tiers';

interface Tier {
  id: string;
  minQuantity: number;
  discountPercent: string;
}

interface Props {
  productId: string;
  productSlug: string;
  tiers: Tier[];
}

export function PriceTiersPanel({ productId, productSlug, tiers }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createPriceTierAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create the price tier');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removePriceTierAction(id, productSlug);
      if (!result.ok) {
        setError(result.error ?? 'Could not remove the price tier');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-8 max-w-lg">
      <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1">Volume Pricing</h2>
      <p className="text-[12px] text-steel mb-3">
        A percentage off the retail or trade price, whichever the customer already qualifies for — see
        docs/AGENTS.md&apos;s tiered pricing section.
      </p>

      {tiers.length > 0 && (
        <ul className="mb-4">
          {tiers.map((tier) => (
            <li key={tier.id} className="flex items-center justify-between py-2 border-b border-black/5 text-sm">
              <span>
                {tier.minQuantity}+ units: {Number(tier.discountPercent)}% off
              </span>
              <button
                onClick={() => handleRemove(tier.id)}
                disabled={isPending}
                className="font-mono text-[11px] text-steel hover:text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex gap-2 items-end">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="productSlug" value={productSlug} />
        <input
          name="minQuantity"
          type="number"
          min={2}
          required
          placeholder="Min qty"
          className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
        />
        <input
          name="discountPercent"
          type="number"
          min={0.01}
          max={100}
          step="0.01"
          required
          placeholder="% off"
          className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
        >
          Add Tier
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
