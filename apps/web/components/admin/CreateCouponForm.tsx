'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCouponAction } from '@/lib/actions/admin-coupons';

export function CreateCouponForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createCouponAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create the coupon');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            name="code"
            required
            placeholder="Code (e.g. SUMMER10)"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
          <select
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off (R)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            name="discountValue"
            type="number"
            step="0.01"
            min={0}
            max={discountType === 'PERCENTAGE' ? 100 : undefined}
            required
            placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10 (%)' : 'e.g. 50 (R)'}
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
          <input
            name="minSubtotal"
            type="number"
            step="0.01"
            min={0}
            placeholder="Minimum order (optional, R)"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            name="maxUses"
            type="number"
            min={1}
            placeholder="Total use limit (optional)"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
          <input
            name="maxUsesPerAccount"
            type="number"
            min={1}
            placeholder="Per-customer limit (optional)"
            className="border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
              Valid from (optional)
            </label>
            <input
              name="validFrom"
              type="date"
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
              Valid until (optional)
            </label>
            <input
              name="validUntil"
              type="date"
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create Coupon'}
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
