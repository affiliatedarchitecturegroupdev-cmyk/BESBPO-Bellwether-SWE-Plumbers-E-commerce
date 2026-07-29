'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createWarehouseAction } from '@/lib/actions/admin-warehouses';

export function CreateWarehouseForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createWarehouseAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create warehouse');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            name="name"
            required
            placeholder="Warehouse name"
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-3">
          <input
            name="streetAddress"
            required
            placeholder="Street address"
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <input name="city" required placeholder="City" className="border border-black/15 rounded-sm px-3 py-2 text-sm" />
          <input
            name="province"
            required
            placeholder="Province"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
          <input
            name="postalCode"
            required
            placeholder="Postal code"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create Warehouse'}
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
