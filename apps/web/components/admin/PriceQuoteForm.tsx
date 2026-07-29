'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { priceQuoteAction } from '@/lib/actions/quote-actions';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string | null;
}

interface Props {
  quoteId: string;
  items: QuoteItem[];
  currentTotal: string | null;
  currentNotes: string | null;
}

export function PriceQuoteForm({ quoteId, items, currentTotal, currentNotes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await priceQuoteAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not price this quote');
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <input type="hidden" name="quoteId" value={quoteId} />

      <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">Price Each Item</h2>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 mb-2">
          <input type="hidden" name="itemId" value={item.id} />
          <span className="flex-1 text-sm">
            {item.quantity}× {item.description}
          </span>
          <input
            name="unitPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={item.unitPrice ?? ''}
            placeholder="Unit price"
            required
            className="w-28 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4 mt-5 mb-4">
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Total (R)
          </label>
          <input
            name="quotedTotal"
            type="number"
            min={0}
            step="0.01"
            defaultValue={currentTotal ?? ''}
            required
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Valid Until
          </label>
          <input
            name="validUntil"
            type="date"
            required
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Notes (visible to customer)
        </label>
        <textarea
          name="adminNotes"
          defaultValue={currentNotes ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[70px]"
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}
      {success && <p className="text-[13px] text-[#1E8E5A] mb-4">Quote sent to customer.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send Quote'}
      </button>
    </form>
  );
}
