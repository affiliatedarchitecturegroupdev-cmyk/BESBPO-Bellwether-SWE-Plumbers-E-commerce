'use client';

import { useState, useTransition } from 'react';
import { recordTransactionAction } from '@/lib/actions/admin-trade-credit';

interface Props {
  accountId: string;
}

export function CreditTransactionForm({ accountId }: Props) {
  const [amount, setAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(kind: 'drawdown' | 'repayment') {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a positive amount first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordTransactionAction(accountId, kind, parsed);
      if (!result.ok) {
        setError(result.error ?? 'Failed');
        return;
      }
      setAmount('');
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0.01}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-[12px]"
      />
      <button
        onClick={() => submit('drawdown')}
        disabled={isPending}
        className="font-mono text-[10.5px] uppercase text-steel hover:text-red-600 disabled:opacity-60"
      >
        Drawdown
      </button>
      <button
        onClick={() => submit('repayment')}
        disabled={isPending}
        className="font-mono text-[10.5px] uppercase text-hydra disabled:opacity-60"
      >
        Repayment
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
