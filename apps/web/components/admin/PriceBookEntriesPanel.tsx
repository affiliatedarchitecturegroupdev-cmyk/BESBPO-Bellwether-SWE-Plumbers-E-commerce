'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPriceBookEntryAction, removePriceBookEntryAction } from '@/lib/actions/admin-pricing';

interface Entry {
  id: string;
  sector: string;
  serviceCode: string;
  baseLaborRate: string;
  unit: string;
  effectiveFrom: string;
}

const UNITS = ['per_fixture', 'per_meter', 'per_hour'];

export function PriceBookEntriesPanel({ entries }: { entries: Entry[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createPriceBookEntryAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create the entry');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removePriceBookEntryAction(id);
      if (!result.ok) {
        setError(result.error ?? 'Could not remove the entry');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-10">
      <h2 className="font-display text-lg font-bold mb-1">Price Book</h2>
      <p className="text-sm text-steel mb-4">
        Labor rates by sector and service. This is an append-only rate history — the quote engine always uses
        whichever entry is most recent for a given sector/service, so &quot;changing&quot; a rate means adding a
        new entry here, not editing the old one. Remove is only for correcting a genuine mistake.
      </p>

      {entries.length > 0 && (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Sector</th>
              <th className="pb-2 font-normal">Service</th>
              <th className="pb-2 font-normal">Rate</th>
              <th className="pb-2 font-normal">Unit</th>
              <th className="pb-2 font-normal">Effective From</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-black/5">
                <td className="py-2">{entry.sector}</td>
                <td className="py-2 font-mono text-[12px]">{entry.serviceCode}</td>
                <td className="py-2">R{Number(entry.baseLaborRate).toFixed(2)}</td>
                <td className="py-2 text-steel">{entry.unit}</td>
                <td className="py-2 text-steel">{new Date(entry.effectiveFrom).toLocaleDateString('en-ZA')}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleRemove(entry.id)}
                    disabled={isPending}
                    className="font-mono text-[11px] text-steel hover:text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
        <input
          name="sector"
          required
          placeholder="Sector"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-32"
        />
        <input
          name="serviceCode"
          required
          placeholder="Service code"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-40"
        />
        <input
          name="baseLaborRate"
          type="number"
          step="0.01"
          min={0}
          required
          placeholder="Rate (R)"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-28"
        />
        <select name="unit" required className="border border-black/15 rounded-sm px-2 py-1.5 text-sm">
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
        >
          Add Entry
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
