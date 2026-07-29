'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateBookingStatusAction } from '@/lib/actions/admin-bookings';

const STATUS_OPTIONS = ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

interface Props {
  bookingId: string;
  currentStatus: string;
}

export function BookingStatusForm({ bookingId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateBookingStatusAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Update failed');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <select
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-black/15 rounded-sm px-2 py-1.5 text-[12px] font-mono"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {status === 'SCHEDULED' && (
        <input
          type="datetime-local"
          name="scheduledFor"
          required
          className="border border-black/15 rounded-sm px-2 py-1.5 text-[12px]"
        />
      )}
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11px] text-hydra disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </form>
  );
}
