'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  currentStatus: string;
  options: string[];
  action: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
  id: string;
}

export function StatusSelect({ currentStatus, options, action, id }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    setError(null);
    startTransition(async () => {
      const result = await action(id, status);
      if (!result.ok) {
        setError(result.error ?? 'Update failed');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className="border border-black/15 rounded-sm px-2 py-1.5 text-[12px] font-mono"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
