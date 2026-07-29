'use client';

import { useState, useTransition } from 'react';
import { createTradeCreditAccountAction } from '@/lib/actions/admin-trade-credit';

export function CreateTradeCreditAccountForm() {
  const [creditPath, setCreditPath] = useState<'INTERNAL_INCIDENTAL' | 'THIRD_PARTY_INTERMEDIARY'>(
    'INTERNAL_INCIDENTAL',
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const outcome = await createTradeCreditAccountAction(formData);
      setResult(outcome);
      if (outcome.ok) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Account ID
        </label>
        <input
          name="accountId"
          required
          placeholder="Copy from an existing order or booking's customer"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Credit Path
        </label>
        <select
          name="creditPath"
          value={creditPath}
          onChange={(e) => setCreditPath(e.target.value as typeof creditPath)}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        >
          <option value="INTERNAL_INCIDENTAL">Internal incidental credit</option>
          <option value="THIRD_PARTY_INTERMEDIARY">Third-party intermediary</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Credit Limit (R)
          </label>
          <input
            name="creditLimit"
            type="number"
            min={0}
            step="0.01"
            required
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Payment Terms (days)
          </label>
          <input
            name="paymentTermDays"
            type="number"
            min={1}
            defaultValue={30}
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
      </div>

      {creditPath === 'THIRD_PARTY_INTERMEDIARY' && (
        <>
          <div className="mb-4">
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
              Intermediary Provider
            </label>
            <input
              name="intermediaryProvider"
              required
              placeholder="e.g. Lula, Merchant Capital, Tyme Business"
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
              Intermediary Account Reference
            </label>
            <input
              name="intermediaryAccountRef"
              required
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {result?.error && <p className="text-[12.5px] text-red-600 mb-4">{result.error}</p>}
      {result?.ok && <p className="text-[12.5px] text-[#1E8E5A] mb-4">Account created and approved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Account'}
      </button>
    </form>
  );
}
