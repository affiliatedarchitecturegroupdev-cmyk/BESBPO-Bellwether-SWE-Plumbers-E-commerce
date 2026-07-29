'use client';

import { useState, useTransition } from 'react';
import { issueCoCAction } from '@/lib/actions/admin-service-records';

export function IssueCoCForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const outcome = await issueCoCAction(formData);
      setResult(outcome);
      if (outcome.ok) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Booking ID
        </label>
        <input
          name="bookingId"
          required
          placeholder="Copy from the Bookings page"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          PIRB Registration Number
        </label>
        <input name="pirbRegNumber" required className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Certificate Number
        </label>
        <input
          name="certificateNumber"
          required
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="mb-5">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Document URL
        </label>
        <input
          name="documentUrl"
          type="url"
          required
          placeholder="S3 URL of the uploaded certificate PDF"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>

      {result?.error && <p className="text-[12.5px] text-red-600 mb-4">{result.error}</p>}
      {result?.ok && <p className="text-[12.5px] text-[#1E8E5A] mb-4">Certificate issued.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Issuing…' : 'Issue Certificate'}
      </button>
    </form>
  );
}
