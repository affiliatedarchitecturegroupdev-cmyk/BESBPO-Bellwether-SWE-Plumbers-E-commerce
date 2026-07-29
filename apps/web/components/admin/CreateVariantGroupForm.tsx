'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createVariantGroupAction } from '@/lib/actions/admin-variant-groups';

export function CreateVariantGroupForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget; // captured now — e.currentTarget is null by the time the async callback below runs
    setError(null);
    startTransition(async () => {
      const result = await createVariantGroupAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create variant group');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Group Name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Copper Pipe"
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Option Label
          </label>
          <input
            name="optionLabel"
            required
            placeholder="e.g. Size"
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60 whitespace-nowrap"
        >
          {isPending ? 'Creating…' : 'Create Group'}
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
