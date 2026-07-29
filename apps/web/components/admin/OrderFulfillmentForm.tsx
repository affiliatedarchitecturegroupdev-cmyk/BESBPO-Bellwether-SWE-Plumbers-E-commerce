'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderFulfillmentAction } from '@/lib/actions/admin-orders';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

interface Props {
  orderId: string;
  currentStatus: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export function OrderFulfillmentForm({ orderId, currentStatus, courierName, trackingNumber, trackingUrl }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateOrderFulfillmentAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not update order');
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-black/10 rounded-sm p-5">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">Status</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-black/15 rounded-sm px-2 py-1.5 text-[12px] font-mono"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {(status === 'DISPATCHED' || Boolean(courierName || trackingNumber)) && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
                Courier
              </label>
              <input
                name="courierName"
                defaultValue={courierName ?? ''}
                placeholder="e.g. RAM, The Courier Guy"
                className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
                Tracking Number
              </label>
              <input
                name="trackingNumber"
                defaultValue={trackingNumber ?? ''}
                className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
              Direct Tracking URL (optional)
            </label>
            <input
              name="trackingUrl"
              type="url"
              defaultValue={trackingUrl ?? ''}
              placeholder="Paste one if the courier's own confirmation included a direct link"
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-steel mt-1">
              Left blank, we link to the courier&apos;s general tracking page instead (for known couriers).
            </p>
          </div>
        </>
      )}

      {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}
      {success && <p className="text-[13px] text-[#1E8E5A] mb-3">Saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
