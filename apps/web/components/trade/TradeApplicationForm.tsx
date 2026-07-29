'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyForTradeAccountAction } from '@/lib/actions/trade-application-actions';

export function TradeApplicationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await applyForTradeAccountAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not submit your application');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Company Name
        </label>
        <input
          name="companyName"
          required
          placeholder="Your company's registered name"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Registration Number (optional)
          </label>
          <input name="companyRegNumber" className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Years in Business (optional)
          </label>
          <input
            name="yearsInBusiness"
            type="number"
            min={0}
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Anything else we should know? (optional)
        </label>
        <textarea
          name="message"
          placeholder="e.g. what kind of work you do, typical order volume"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[80px]"
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}
