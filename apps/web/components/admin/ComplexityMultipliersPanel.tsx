'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createComplexityMultiplierAction,
  removeComplexityMultiplierAction,
  updateComplexityMultiplierAction,
} from '@/lib/actions/admin-pricing';

interface Multiplier {
  id: string;
  code: string;
  label: string;
  multiplier: string;
  description: string | null;
}

function MultiplierRow({ multiplier }: { multiplier: Multiplier }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateComplexityMultiplierAction(multiplier.id, formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not update');
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeComplexityMultiplierAction(multiplier.id);
      if (!result.ok) setError(result.error ?? 'Could not remove');
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b border-black/5">
        <td colSpan={4} className="py-2">
          <form onSubmit={handleUpdate} className="flex gap-2 items-center">
            <span className="font-mono text-[12px] text-steel">{multiplier.code}</span>
            <input
              name="label"
              defaultValue={multiplier.label}
              className="border border-black/15 rounded-sm px-2 py-1 text-sm flex-1"
            />
            <input
              name="multiplier"
              type="number"
              step="0.01"
              min={0.01}
              defaultValue={multiplier.multiplier}
              className="border border-black/15 rounded-sm px-2 py-1 text-sm w-20"
            />
            <button
              type="submit"
              disabled={isPending}
              className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-2 py-1 disabled:opacity-60"
            >
              Save
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="font-mono text-[11px] text-steel">
              Cancel
            </button>
          </form>
          {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-black/5">
      <td className="py-2 font-mono text-[12px]">{multiplier.code}</td>
      <td className="py-2">{multiplier.label}</td>
      <td className="py-2">×{Number(multiplier.multiplier).toFixed(2)}</td>
      <td className="py-2">
        <button onClick={() => setIsEditing(true)} className="font-mono text-[11px] text-hydra mr-3">
          Edit
        </button>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="font-mono text-[11px] text-steel hover:text-red-600 disabled:opacity-40"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

export function ComplexityMultipliersPanel({ multipliers }: { multipliers: Multiplier[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createComplexityMultiplierAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create the multiplier');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="font-display text-lg font-bold mb-1">Complexity Multipliers</h2>
      <p className="text-sm text-steel mb-4">
        Applied multiplicatively in the quote engine (1.25 × 1.15, not added) — unlike the price book above, these
        are edited in place since there&apos;s no rate-history concept for a multiplier.
      </p>

      {multipliers.length > 0 && (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Code</th>
              <th className="pb-2 font-normal">Label</th>
              <th className="pb-2 font-normal">Multiplier</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {multipliers.map((m) => (
              <MultiplierRow key={m.id} multiplier={m} />
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
        <input
          name="code"
          required
          placeholder="CODE_LIKE_THIS"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-36 font-mono"
        />
        <input
          name="label"
          required
          placeholder="Label"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-32"
        />
        <input
          name="multiplier"
          type="number"
          step="0.01"
          min={0.01}
          required
          placeholder="e.g. 1.25"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-24"
        />
        <input
          name="description"
          placeholder="Description (optional)"
          className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-48"
        />
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
        >
          Add Multiplier
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
