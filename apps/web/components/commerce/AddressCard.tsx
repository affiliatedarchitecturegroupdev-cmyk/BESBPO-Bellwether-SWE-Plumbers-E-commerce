'use client';

import { useState, useTransition } from 'react';
import { Address } from '@/lib/types';
import { deleteAddressAction, setDefaultAddressAction } from '@/lib/actions/address-actions';

interface Props {
  address: Address;
}

export function AddressCard({ address }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSetDefault() {
    startTransition(async () => {
      const result = await setDefaultAddressAction(address.id);
      if (!result.ok) setError(result.error ?? 'Failed');
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      if (!result.ok) setError(result.error ?? 'Failed');
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      {address.isDefault && (
        <span className="font-mono text-[10px] uppercase tracking-wide text-hydra bg-[#EAF3F8] px-2 py-0.5 rounded-sm inline-block mb-2">
          Default
        </span>
      )}
      <p className="text-sm text-[#4A5157]">
        {address.line1}
        {address.line2 && <>, {address.line2}</>}
        <br />
        {address.city}, {address.province} {address.postalCode}
      </p>
      <div className="flex gap-4 mt-3">
        {!address.isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={isPending}
            className="font-mono text-[11px] text-hydra"
          >
            Set as default
          </button>
        )}
        <button onClick={handleDelete} disabled={isPending} className="font-mono text-[11px] text-steel hover:text-red-600">
          Delete
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
