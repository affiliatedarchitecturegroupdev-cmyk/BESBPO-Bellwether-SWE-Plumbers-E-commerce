'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelOrderAction } from '@/lib/actions/order-actions';

interface Props {
  orderId: string;
}

export function CancelOrderButton({ orderId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await cancelOrderAction(orderId);
      if (!result.ok) {
        setError(result.error ?? 'Could not cancel order');
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`font-mono text-[11px] uppercase tracking-wide ${
          confirming ? 'text-red-600' : 'text-steel hover:text-red-600'
        }`}
      >
        {isPending ? 'Cancelling…' : confirming ? 'Confirm cancellation?' : 'Cancel Order'}
      </button>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
