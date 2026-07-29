'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  action: (id: string) => Promise<{ ok: boolean; error?: string }>;
  id: string;
  itemLabel: string;
  redirectTo?: string;
}

// One confirm click, not a modal dialog — this is an internal admin tool,
// not a customer-facing surface, so a plain "are you sure" swap is
// proportionate rather than building a full dialog component for it.
export function DeleteButton({ action, id, itemLabel, redirectTo }: Props) {
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
      const result = await action(id);
      if (!result.ok) {
        setError(result.error ?? 'Delete failed');
        setConfirming(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`font-mono text-[11px] uppercase tracking-wide ${
          confirming ? 'text-red-600' : 'text-steel hover:text-red-600'
        }`}
      >
        {isPending ? 'Deleting…' : confirming ? `Confirm delete ${itemLabel}?` : 'Delete'}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
