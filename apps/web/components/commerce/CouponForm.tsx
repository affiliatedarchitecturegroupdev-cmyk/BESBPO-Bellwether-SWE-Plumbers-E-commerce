'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyCouponAction, removeCouponAction } from '@/lib/actions/coupon-actions';

interface Props {
  couponCode: string | null;
  couponError: string | null;
}

export function CouponForm({ couponCode, couponError }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await applyCouponAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not apply that coupon');
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCouponAction();
      if (!result.ok) {
        setError(result.error ?? 'Could not remove the coupon');
        return;
      }
      router.refresh();
    });
  }

  if (couponCode) {
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between text-[13px]">
          <span>
            Coupon <span className="font-mono">{couponCode}</span>
            {couponError && <span className="text-red-600 ml-1">— {couponError}</span>}
          </span>
          <button onClick={handleRemove} disabled={isPending} className="text-steel hover:text-red-600 text-[12px]">
            Remove
          </button>
        </div>
        {error && <p className="text-[12px] text-red-600 mt-1.5">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="mb-5">
      <div className="flex gap-2">
        <input
          name="code"
          placeholder="Coupon code"
          className="flex-1 border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-4 disabled:opacity-60"
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-[12px] text-red-600 mt-1.5">{error}</p>}
    </form>
  );
}
