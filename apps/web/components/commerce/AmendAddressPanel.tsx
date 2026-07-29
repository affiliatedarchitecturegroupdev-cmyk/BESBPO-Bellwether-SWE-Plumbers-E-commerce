'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { amendOrderAddressAction } from '@/lib/actions/order-amendment-actions';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
}

interface Props {
  orderId: string;
  address: Address;
}

export function AmendAddressPanel({ orderId, address }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await amendOrderAddressAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not update the delivery address');
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  if (!isEditing) {
    return (
      <div>
        <p className="text-sm text-[#4A5157]">
          {address.line1}
          {address.line2 && <>, {address.line2}</>}
          <br />
          {address.city}, {address.province} {address.postalCode}
        </p>
        <button onClick={() => setIsEditing(true)} className="font-mono text-[11px] text-hydra mt-2">
          Change address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="orderId" value={orderId} />
      <div className="mb-2">
        <input
          name="line1"
          defaultValue={address.line1}
          required
          placeholder="Address line 1"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="mb-2">
        <input
          name="line2"
          defaultValue={address.line2 ?? ''}
          placeholder="Address line 2 (optional)"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          name="city"
          defaultValue={address.city}
          required
          placeholder="City"
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <input
          name="postalCode"
          defaultValue={address.postalCode}
          required
          placeholder="Postal code"
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="mb-3">
        <input
          name="province"
          defaultValue={address.province}
          required
          placeholder="Province"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-[12px] text-red-600 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink text-white font-mono text-[11px] uppercase tracking-wide px-4 py-2 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="font-mono text-[11px] text-steel px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
