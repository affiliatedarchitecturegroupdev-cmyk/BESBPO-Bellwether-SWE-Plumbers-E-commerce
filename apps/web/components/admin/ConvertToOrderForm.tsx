'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { convertQuoteToOrderAction } from '@/lib/actions/quote-actions';

interface Props {
  quoteId: string;
}

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export function ConvertToOrderForm({ quoteId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await convertQuoteToOrderAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not convert this quote to an order');
        return;
      }
      router.push(`/admin/orders/${result.orderId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md border border-black/10 rounded-sm p-5">
      <input type="hidden" name="quoteId" value={quoteId} />
      <h2 className="text-base font-semibold mb-1">Convert to Order</h2>
      <p className="text-[12.5px] text-steel mb-4">
        Creates a CONFIRMED order at the negotiated line-item prices. A quote never collects a delivery
        address, so enter where this ships.
      </p>

      <div className="mb-3">
        <input name="line1" placeholder="Address line 1" required className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="mb-3">
        <input name="line2" placeholder="Address line 2 (optional)" className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input name="city" placeholder="City" required className="border border-black/15 rounded-sm px-3 py-2 text-sm" />
        <input name="postalCode" placeholder="Postal code" required className="border border-black/15 rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="mb-4">
        <select name="province" required defaultValue="" className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm">
          <option value="" disabled>
            Select a province
          </option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Order'}
      </button>
    </form>
  );
}
